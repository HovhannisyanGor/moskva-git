import SwiftUI

struct MainTabs: View {
    var body: some View {
        TabView {
            MapScreen()
                .tabItem { Label("Карта", systemImage: "map.fill") }
            FeedScreen()
                .tabItem { Label("Лента", systemImage: "square.stack.fill") }
            ChatsScreen()
                .tabItem { Label("Чаты", systemImage: "bubble.left.and.bubble.right.fill") }
            ProfileScreen()
                .tabItem { Label("Профиль", systemImage: "person.crop.circle.fill") }
        }
        .tint(Theme.accent)
    }
}

// Общий аватар: картинка с сервера или кружок с буквой.
struct AvatarView: View {
    let avatar: String
    let color: String
    let letter: String
    var size: CGFloat = 44

    var body: some View {
        if !avatar.isEmpty, let url = URL(string: avatar) {
            AsyncImage(url: url) { img in
                img.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color(hexString: color))
            }
            .frame(width: size, height: size).clipShape(Circle())
        } else {
            Circle().fill(Color(hexString: color))
                .frame(width: size, height: size)
                .overlay(Text(letter.isEmpty ? "?" : letter)
                    .font(.system(size: size * 0.42, weight: .bold)).foregroundColor(.white))
        }
    }
}
