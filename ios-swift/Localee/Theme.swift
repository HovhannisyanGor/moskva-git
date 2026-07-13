import SwiftUI

// Палитра Localee — те же токены, что на сайте, адаптивные под светлую/тёмную тему.
// Цвета автоматически меняются по системной теме (UITraitCollection),
// поэтому во всех экранах достаточно писать Theme.bg и т.п.
enum Theme {
    static let accent = Color(hex: 0xFA3C3C)
    static let accentDark = Color(hex: 0xD32330)
    static let nightlife = Color(hex: 0xC04CFF)

    static let bg      = dyn(light: 0xF2F2F6, dark: 0x121013)
    static let bg2     = dyn(light: 0xE9E9EE, dark: 0x1C191E)
    static let card    = dyn(light: 0xFFFFFF, dark: 0x201C23)
    static let text    = dyn(light: 0x1A1A1C, dark: 0xF0EEF1)
    static let text2   = dyn(light: 0x5A5B62, dark: 0xA0A0A8)
    static let text3   = dyn(light: 0x9A9BA2, dark: 0x66646C)
    static let inputBg = dyn(light: 0xFFFFFF, dark: 0x26212B)
    static let border  = dynA(
        light: UIColor(white: 0, alpha: 0.08),
        dark: UIColor(white: 1, alpha: 0.10))

    // Цвет, меняющийся по теме.
    private static func dyn(light: UInt, dark: UInt) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(rgb: dark) : UIColor(rgb: light) })
    }
    private static func dynA(light: UIColor, dark: UIColor) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? dark : light })
    }
}

extension UIColor {
    convenience init(rgb: UInt) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xff) / 255,
            green: CGFloat((rgb >> 8) & 0xff) / 255,
            blue: CGFloat(rgb & 0xff) / 255,
            alpha: 1)
    }
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }
    // Цвет из hex-строки вида "#RRGGBB" (для аватаров с сервера).
    init(hexString: String) {
        var s = hexString.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0x888888
        Scanner(string: s).scanHexInt64(&v)
        self.init(hex: UInt(v))
    }
}
