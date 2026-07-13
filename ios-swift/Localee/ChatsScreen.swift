import SwiftUI

struct ChatsScreen: View {
    @State private var chats: [ChatListItem] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView().tint(Theme.accent)
                } else if chats.isEmpty {
                    Text("Пока нет диалогов").foregroundColor(Theme.text3)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(chats) { item in
                                NavigationLink { ChatView(peer: item.user) } label: { row(item) }
                                Divider().overlay(Theme.border).padding(.leading, 78)
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Чаты")
            .toolbarBackground(Theme.bg, for: .navigationBar)
        }
        .task { await load() }
    }

    private func row(_ item: ChatListItem) -> some View {
        HStack(spacing: 12) {
            AvatarView(avatar: item.user.avatar, color: item.user.color, letter: item.user.letter, size: 52)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(item.user.name).font(.system(size: 16, weight: .bold)).foregroundColor(Theme.text)
                    Spacer()
                    if let last = item.last {
                        Text(timeAgo(last.createdAt)).font(.system(size: 12)).foregroundColor(Theme.text3)
                    }
                }
                HStack {
                    Text(item.last.map { ($0.fromMe ? "Вы: " : "") + $0.text } ?? "Нет сообщений")
                        .font(.system(size: 14)).foregroundColor(Theme.text2).lineLimit(1)
                    Spacer()
                    if item.unread > 0 {
                        Text("\(item.unread)").font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                            .padding(.horizontal, 7).padding(.vertical, 2)
                            .background(Theme.accent).clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 11)
        .contentShape(Rectangle())
    }

    private func load() async {
        do { chats = try await API.shared.chats() } catch {}
        loading = false
    }
}

struct ChatView: View {
    let peer: ChatUser
    @State private var messages: [ChatMessage] = []
    @State private var text = ""
    @State private var timer: Timer?

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messages) { m in bubble(m).id(m.id) }
                    }
                    .padding(12)
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
            inputBar
        }
        .background(Theme.bg.ignoresSafeArea())
        .navigationTitle(peer.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.bg, for: .navigationBar)
        .task {
            await load()
            timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in Task { await load() } }
        }
        .onDisappear { timer?.invalidate() }
    }

    private func bubble(_ m: ChatMessage) -> some View {
        HStack {
            if m.fromMe { Spacer(minLength: 50) }
            VStack(alignment: .trailing, spacing: 3) {
                Text(m.text).font(.system(size: 15.5))
                    .foregroundColor(m.fromMe ? .white : Theme.text)
                Text(clock(m.createdAt) + (m.edited ? " · изменено" : ""))
                    .font(.system(size: 11))
                    .foregroundColor(m.fromMe ? .white.opacity(0.7) : Theme.text3)
            }
            .padding(.horizontal, 13).padding(.vertical, 8)
            .background(m.fromMe ? Theme.accent : Theme.card)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            if !m.fromMe { Spacer(minLength: 50) }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField("", text: $text, prompt: Text("Сообщение…").foregroundColor(Theme.text3), axis: .vertical)
                .foregroundColor(Theme.text).lineLimit(1...5)
                .padding(.horizontal, 15).padding(.vertical, 10)
                .background(Theme.inputBg).clipShape(RoundedRectangle(cornerRadius: 20))
            Button(action: send) {
                Image(systemName: "arrow.up").font(.system(size: 18, weight: .bold)).foregroundColor(.white)
                    .frame(width: 44, height: 44).background(Theme.accent).clipShape(Circle())
            }
            .opacity(text.trimmed.isEmpty ? 0.4 : 1)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Theme.bg)
    }

    private func load() async {
        if let r = try? await API.shared.messages(with: peer.id) { messages = r.messages }
    }
    private func send() {
        let t = text.trimmed
        guard !t.isEmpty else { return }
        text = ""
        Task {
            if let m = try? await API.shared.send(to: peer.id, text: t) { messages.append(m) }
        }
    }
    private func clock(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        let s = iso.contains("T") ? iso : iso.replacingOccurrences(of: " ", with: "T") + "Z"
        guard let d = f.date(from: s) else { return "" }
        let df = DateFormatter(); df.dateFormat = "HH:mm"
        return df.string(from: d)
    }
}
