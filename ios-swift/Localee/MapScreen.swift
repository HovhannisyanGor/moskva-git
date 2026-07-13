import SwiftUI
import MapKit

private let ALL_CATS: [PlaceCategory] = [.landmark, .park, .museum, .restaurant, .entertainment]

struct MapScreen: View {
    @State private var show18 = false
    @State private var ageAsk = false
    @State private var selected: Place?
    @State private var sheetExpanded = false
    @State private var activeCats: Set<PlaceCategory> = Set(ALL_CATS + [.nightlife])
    @State private var camera = MapCameraPosition.region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 55.7558, longitude: 37.6173),
            span: MKCoordinateSpan(latitudeDelta: 0.18, longitudeDelta: 0.18)))

    // Пользовательские метки
    @State private var pins: [MapPin] = []
    @State private var placing = false                 // режим постановки
    @State private var draftCoord: CLLocationCoordinate2D?
    @State private var draftKind = "crowd"
    @State private var draftNote = ""
    @State private var viewPin: MapPin?

    private var places: [Place] {
        PLACES.filter { p in
            (show18 || p.category != .nightlife) && activeCats.contains(p.category)
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            MapReader { proxy in
                Map(position: $camera) {
                    ForEach(places) { place in
                        Annotation(place.name, coordinate:
                            CLLocationCoordinate2D(latitude: place.lat, longitude: place.lng)) {
                            Button { select(place) } label: {
                                Circle().fill(place.category.color)
                                    .frame(width: 22, height: 22)
                                    .overlay(Circle().stroke(.white, lineWidth: 2))
                                    .shadow(radius: 2)
                            }
                        }
                    }
                    // Пользовательские метки
                    ForEach(pins) { pin in
                        Annotation(pin.title, coordinate:
                            CLLocationCoordinate2D(latitude: pin.lat, longitude: pin.lng)) {
                            Button { viewPin = pin } label: {
                                Text(pin.emoji).font(.system(size: 22))
                                    .frame(width: 40, height: 40)
                                    .background(Theme.card).clipShape(Circle())
                                    .overlay(Circle().stroke(Theme.accent, lineWidth: 2))
                                    .shadow(radius: 2)
                            }
                        }
                    }
                }
                .ignoresSafeArea(edges: .top)
                // В режиме постановки — тап по карте ставит метку
                .onTapGesture { screenPt in
                    guard placing, let c = proxy.convert(screenPt, from: .local) else { return }
                    draftCoord = c
                    placing = false
                }
            }

            // 18+
            Button {
                if show18 { show18 = false } else { ageAsk = true }
            } label: {
                Text("18+")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(show18 ? .white : Theme.text)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(show18 ? Theme.nightlife : Theme.card)
                    .clipShape(Capsule())
                    .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
            }
            .padding(.leading, 14).padding(.top, 8)

            // Кнопка «Отметить» (справа)
            VStack {
                Button { placing.toggle(); sheetExpanded = false } label: {
                    HStack(spacing: 6) {
                        Image(systemName: placing ? "xmark" : "mappin.and.ellipse")
                        Text(placing ? "Отмена" : "Отметить").fontWeight(.semibold)
                    }
                    .font(.system(size: 15))
                    .foregroundColor(placing ? Theme.text : .white)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(placing ? Theme.card : Theme.accent)
                    .clipShape(Capsule())
                    .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.trailing, 14).padding(.top, 8)

            // Подсказка в режиме постановки
            if placing {
                Text("Нажмите на карте, где это происходит")
                    .font(.system(size: 14, weight: .medium)).foregroundColor(.white)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Theme.accent).clipShape(Capsule())
                    .shadow(radius: 6)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 60)
            }

            // Шторка снизу (Яндекс-стиль)
            BottomSheet(expanded: $sheetExpanded, peekHeight: 96) {
                sheetContent
            }
        }
        .alert("Вам есть 18 лет?", isPresented: $ageAsk) {
            Button("Мне есть 18") { show18 = true }
            Button("Мне нет 18", role: .cancel) {}
        } message: {
            Text("Раздел показывает бары, клубы и кальянные — контент для взрослых.")
        }
        .onChange(of: sheetExpanded) { _, isOpen in
            if !isOpen { selected = nil }
        }
        .sheet(isPresented: Binding(get: { draftCoord != nil }, set: { if !$0 { draftCoord = nil } })) {
            pinDraftSheet
        }
        .sheet(item: $viewPin) { pin in pinViewSheet(pin) }
        .task { await loadPins() }
    }

    // Форма новой метки
    private var pinDraftSheet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Что здесь происходит?").font(.system(size: 20, weight: .heavy)).foregroundColor(Theme.text)
            HStack(spacing: 10) {
                pinKindButton("crowd", "👥", "Скопление")
                pinKindButton("meetup", "📣", "Сходка")
                pinKindButton("drift", "🏎️", "Дрифт")
            }
            TextField("", text: $draftNote, prompt: Text("Заметка (необязательно)").foregroundColor(Theme.text3), axis: .vertical)
                .foregroundColor(Theme.text).lineLimit(2...4)
                .padding(12).background(Theme.inputBg).clipShape(RoundedRectangle(cornerRadius: 12))
            Button { Task { await submitPin() } } label: {
                Text("Поставить метку").font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                    .background(Theme.accent).clipShape(RoundedRectangle(cornerRadius: 14))
            }
            Spacer()
        }
        .padding(20).background(Theme.bg)
        .presentationDetents([.height(300)])
    }

    private func pinKindButton(_ kind: String, _ emoji: String, _ label: String) -> some View {
        Button { draftKind = kind } label: {
            VStack(spacing: 4) {
                Text(emoji).font(.system(size: 26))
                Text(label).font(.system(size: 12, weight: .semibold)).foregroundColor(Theme.text2)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 12)
            .background(draftKind == kind ? Theme.accent.opacity(0.15) : Theme.bg2)
            .overlay(RoundedRectangle(cornerRadius: 12)
                .stroke(draftKind == kind ? Theme.accent : Theme.border, lineWidth: 1.5))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    // Просмотр метки
    private func pinViewSheet(_ pin: MapPin) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Text(pin.emoji).font(.system(size: 30))
                VStack(alignment: .leading) {
                    Text(pin.title).font(.system(size: 18, weight: .bold)).foregroundColor(Theme.text)
                    Text("\(pin.author?.name ?? "Аноним") · \(timeAgo(pin.createdAt))")
                        .font(.system(size: 13)).foregroundColor(Theme.text3)
                }
            }
            if !pin.note.isEmpty {
                Text(pin.note).font(.system(size: 15)).foregroundColor(Theme.text2)
            }
            if pin.mine {
                Button(role: .destructive) { Task { await removePin(pin) } } label: {
                    Text("Удалить метку").font(.system(size: 16, weight: .semibold)).foregroundColor(Theme.accent)
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Theme.card).clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            Spacer()
        }
        .padding(20).background(Theme.bg)
        .presentationDetents([.height(pin.mine ? 240 : 180)])
    }

    private func loadPins() async {
        if let p = try? await API.shared.pins() { pins = p }
    }
    private func submitPin() async {
        guard let c = draftCoord else { return }
        if let pin = try? await API.shared.createPin(
            kind: draftKind, lat: c.latitude, lng: c.longitude, note: draftNote.trimmed) {
            pins.insert(pin, at: 0)
        }
        draftCoord = nil; draftNote = ""; draftKind = "crowd"
    }
    private func removePin(_ pin: MapPin) async {
        try? await API.shared.deletePin(id: pin.id)
        pins.removeAll { $0.id == pin.id }
        viewPin = nil
    }

    @ViewBuilder private var sheetContent: some View {
        // Верх (peek): поиск-пилюля + фильтр
        HStack(spacing: 10) {
            Button { sheetExpanded = true } label: {
                HStack(spacing: 8) {
                    Text("✦").foregroundColor(Theme.accent)
                    Text("Спроси AI-помощника")
                        .font(.system(size: 15, weight: .medium)).foregroundColor(Theme.text2)
                    Spacer()
                }
                .padding(.horizontal, 14).padding(.vertical, 12)
                .background(Theme.inputBg).clipShape(Capsule())
            }
            Button { sheetExpanded.toggle() } label: {
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.system(size: 17, weight: .semibold)).foregroundColor(Theme.text)
                    .frame(width: 44, height: 44).background(Theme.inputBg).clipShape(Circle())
            }
        }
        .padding(.horizontal, 16).padding(.bottom, 8)

        if let place = selected {
            PlaceDetail(place: place)
        } else {
            filtersAndList
        }
    }

    @ViewBuilder private var filtersAndList: some View {
        // Фильтр категорий
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(show18 ? ALL_CATS + [.nightlife] : ALL_CATS, id: \.self) { cat in
                    let on = activeCats.contains(cat)
                    Button {
                        if on { activeCats.remove(cat) } else { activeCats.insert(cat) }
                    } label: {
                        HStack(spacing: 6) {
                            Circle().fill(cat.color).frame(width: 8, height: 8)
                            Text(shortLabel(cat)).font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(on ? Theme.text : Theme.text3)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(on ? Theme.card : Theme.bg2)
                        .overlay(Capsule().stroke(on ? cat.color.opacity(0.5) : Theme.border, lineWidth: 1))
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 8)

        // Список мест
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(places) { place in
                    Button { select(place) } label: { listRow(place) }
                    Divider().overlay(Theme.border).padding(.leading, 16)
                }
            }
        }
    }

    private func listRow(_ place: Place) -> some View {
        HStack(spacing: 12) {
            Circle().fill(place.category.color).frame(width: 12, height: 12)
            VStack(alignment: .leading, spacing: 2) {
                Text(place.name).font(.system(size: 16, weight: .semibold)).foregroundColor(Theme.text)
                Text(place.category.label).font(.system(size: 13)).foregroundColor(Theme.text3)
            }
            Spacer()
            Text("★ \(place.rating, specifier: "%.1f")")
                .font(.system(size: 13, weight: .bold)).foregroundColor(Color(hex: 0xE8A33D))
        }
        .padding(.horizontal, 16).padding(.vertical, 12).contentShape(Rectangle())
    }

    private func select(_ place: Place) {
        selected = place
        sheetExpanded = true
        withAnimation {
            camera = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: place.lat, longitude: place.lng),
                span: MKCoordinateSpan(latitudeDelta: 0.03, longitudeDelta: 0.03)))
        }
    }

    private func shortLabel(_ c: PlaceCategory) -> String {
        switch c {
        case .landmark: return "Достопримечательности"
        case .park: return "Парки"
        case .museum: return "Музеи"
        case .restaurant: return "Рестораны"
        case .entertainment: return "Развлечения"
        case .nightlife: return "18+"
        }
    }
}

// Карточка места внутри шторки.
struct PlaceDetail: View {
    let place: Place
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let url = URL(string: place.imageUrl), !place.imageUrl.isEmpty {
                    AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Theme.bg2 }
                        .frame(height: 170).frame(maxWidth: .infinity).clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)
                }
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle().fill(place.category.color).frame(width: 10, height: 10)
                        Text(place.category.label).font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Theme.text2)
                        Spacer()
                        Text("★ \(place.rating, specifier: "%.1f")")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: 0xE8A33D))
                    }
                    Text(place.name).font(.system(size: 22, weight: .heavy)).foregroundColor(Theme.text)
                    Text(place.address).font(.system(size: 14)).foregroundColor(Theme.text3)
                    Text(place.description).font(.system(size: 15)).foregroundColor(Theme.text2)
                        .lineSpacing(4).padding(.top, 6)
                    HStack(spacing: 18) {
                        Label(place.price == 0 ? "Бесплатно" : "от \(place.price) ₽", systemImage: "rublesign.circle")
                        Label("~\(place.duration / 60) ч", systemImage: "clock")
                    }
                    .font(.system(size: 14, weight: .semibold)).foregroundColor(Theme.text).padding(.top, 8)
                }
                .padding(16)
            }
        }
    }
}
