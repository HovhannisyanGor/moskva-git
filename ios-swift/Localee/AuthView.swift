import SwiftUI

struct AuthView: View {
    @EnvironmentObject var store: AppStore
    @State private var isLogin = true
    @State private var name = ""
    @State private var handle = ""
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Image("Logo")
                    .resizable().scaledToFit()
                    .frame(width: 84, height: 84)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .padding(.top, 40)
                Text("Localee")
                    .font(.system(size: 28, weight: .heavy)).foregroundColor(Theme.text)
                    .padding(.top, 10)
                Text("исследуй город умно")
                    .font(.system(size: 15)).foregroundColor(Theme.text2)
                    .padding(.bottom, 28)

                // Переключатель Вход / Регистрация
                HStack(spacing: 4) {
                    segment("Вход", isLogin)  { isLogin = true; error = "" }
                    segment("Регистрация", !isLogin) { isLogin = false; error = "" }
                }
                .padding(4)
                .background(Theme.bg2)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.bottom, 20)

                if !isLogin {
                    field("ИМЯ", text: $name, placeholder: "Как вас зовут")
                    field("НИК (ЛАТИНИЦА)", text: $handle, placeholder: "nickname", autoLower: true)
                }
                field("EMAIL", text: $email, placeholder: "you@example.com", autoLower: true, keyboard: .emailAddress)
                field("ПАРОЛЬ", text: $password, placeholder: "••••••••", secure: true)

                Button(action: submit) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 14).fill(Theme.accent).frame(height: 52)
                        if busy { ProgressView().tint(.white) }
                        else {
                            Text(isLogin ? "Войти" : "Создать аккаунт")
                                .font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                        }
                    }
                }
                .padding(.top, 6)

                if !error.isEmpty {
                    Text(error)
                        .font(.system(size: 14)).foregroundColor(Theme.accent)
                        .multilineTextAlignment(.center)
                        .padding(.top, 14)
                }
            }
            .padding(24)
        }
        .background(Theme.bg.ignoresSafeArea())
    }

    private func segment(_ title: String, _ active: Bool, _ tap: @escaping () -> Void) -> some View {
        Button(action: tap) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(active ? .white : Theme.text2)
                .frame(maxWidth: .infinity).padding(.vertical, 10)
                .background(active ? Theme.accent : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 11))
        }
    }

    private func field(
        _ label: String, text: Binding<String>, placeholder: String,
        secure: Bool = false, autoLower: Bool = false, keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.text3).kerning(0.8).padding(.leading, 4)
            Group {
                if secure { SecureField("", text: text, prompt: ph(placeholder)) }
                else { TextField("", text: text, prompt: ph(placeholder)) }
            }
            .foregroundColor(Theme.text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(autoLower ? .never : .sentences)
            .autocorrectionDisabled(autoLower)
            .padding(.horizontal, 14).padding(.vertical, 14)
            .background(Theme.inputBg)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: 0.5))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .padding(.bottom, 14)
    }

    private func ph(_ s: String) -> Text { Text(s).foregroundColor(Theme.text3) }

    private func submit() {
        guard !busy else { return }
        busy = true; error = ""
        Task {
            do {
                let u = isLogin
                    ? try await API.shared.login(email: email.trimmed, password: password)
                    : try await API.shared.register(name: name.trimmed, handle: handle.trimmed, email: email.trimmed, password: password)
                store.signIn(u)
            } catch {
                self.error = error.localizedDescription
            }
            busy = false
        }
    }
}

extension String { var trimmed: String { trimmingCharacters(in: .whitespaces) } }
