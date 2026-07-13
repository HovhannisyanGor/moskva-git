import SwiftUI

struct ProfileScreen: View {
    @EnvironmentObject var store: AppStore

    var body: some View {
        NavigationStack {
            ScrollView {
                if let u = store.user {
                    VStack(spacing: 16) {
                        AvatarView(avatar: u.avatar, color: u.color, letter: u.letter, size: 96)
                            .padding(.top, 24)
                        VStack(spacing: 4) {
                            Text(u.name).font(.system(size: 24, weight: .heavy)).foregroundColor(Theme.text)
                            Text("@\(u.handle)").font(.system(size: 15)).foregroundColor(Theme.text2)
                        }
                        if !u.bio.isEmpty {
                            Text(u.bio).font(.system(size: 15)).foregroundColor(Theme.text2)
                                .multilineTextAlignment(.center).padding(.horizontal, 24)
                        }

                        VStack(spacing: 0) {
                            infoRow("Email", u.email.isEmpty ? "—" : u.email)
                            Divider().overlay(Theme.border)
                            infoRow("Город", u.city.isEmpty ? "—" : u.city)
                            Divider().overlay(Theme.border)
                            infoRow("Роль", u.role == "admin" ? "Администратор" : "Пользователь")
                        }
                        .background(Theme.card)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 0.5))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16).padding(.top, 8)

                        Button {
                            store.signOut()
                        } label: {
                            Text("Выйти")
                                .font(.system(size: 16, weight: .semibold)).foregroundColor(Theme.accent)
                                .frame(maxWidth: .infinity).padding(.vertical, 14)
                                .background(Theme.card)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 0.5))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.horizontal, 16).padding(.top, 8)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Профиль")
            .toolbarBackground(Theme.bg, for: .navigationBar)
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 15)).foregroundColor(Theme.text3)
            Spacer()
            Text(value).font(.system(size: 15, weight: .medium)).foregroundColor(Theme.text)
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
    }
}
