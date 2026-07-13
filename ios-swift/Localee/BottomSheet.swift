import SwiftUI

// Шторка снизу как в Яндекс.Картах: свёрнута — виден «peek», тянешь вверх —
// разворачивается. Два снапа: свёрнуто / развёрнуто.
struct BottomSheet<Content: View>: View {
    @Binding var expanded: Bool
    let peekHeight: CGFloat
    @ViewBuilder let content: () -> Content

    @GestureState private var drag: CGFloat = 0

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($drag) { v, s, _ in s = v.translation.height }
            .onEnded { v in
                if v.translation.height < -60 { expanded = true }
                else if v.translation.height > 60 { expanded = false }
            }
    }

    var body: some View {
        GeometryReader { geo in
            let full = geo.size.height
            let sheetHeight = full * 0.9
            let collapsedShift = sheetHeight - peekHeight // насколько опущена свёрнутая
            let base = expanded ? 0 : collapsedShift
            let y = min(max(base + drag, 0), collapsedShift)

            VStack(spacing: 0) {
                // Грабер — за него тянем шторку
                Capsule().fill(Theme.text3.opacity(0.6))
                    .frame(width: 40, height: 5)
                    .padding(.top, 8).padding(.bottom, 6)
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                    .gesture(dragGesture)
                content()
                Spacer(minLength: 0)
            }
            .frame(width: geo.size.width, height: sheetHeight, alignment: .top)
            .background(Theme.bg)
            .clipShape(RoundedCorners(radius: 22, corners: [.topLeft, .topRight]))
            .overlay(
                RoundedCorners(radius: 22, corners: [.topLeft, .topRight])
                    .stroke(Theme.border, lineWidth: 0.5)
            )
            .shadow(color: .black.opacity(0.3), radius: 16, y: -4)
            .offset(y: y)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom) // прижать к низу
            .animation(.spring(response: 0.32, dampingFraction: 0.86), value: expanded)
        }
    }
}

// Скругление только выбранных углов.
struct RoundedCorners: Shape {
    var radius: CGFloat = 20
    var corners: UIRectCorner = .allCorners
    func path(in rect: CGRect) -> Path {
        Path(UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        ).cgPath)
    }
}
