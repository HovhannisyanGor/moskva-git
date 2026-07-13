import SwiftUI

// Глобальное состояние авторизации: держит текущего пользователя,
// проверяет сохранённый токен при старте.
@MainActor
final class AppStore: ObservableObject {
    @Published var user: ApiUser?
    @Published var booting = true

    func boot() async {
        guard API.shared.token != nil else { booting = false; return }
        do {
            user = try await API.shared.me()
        } catch {
            API.shared.logout() // токен протух
        }
        booting = false
    }

    func signIn(_ u: ApiUser) { user = u }

    func signOut() {
        API.shared.logout()
        user = nil
    }
}
