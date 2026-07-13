import SwiftUI

// --- Места (локальные данные, как на сайте) ---
enum PlaceCategory: String, Codable {
    case landmark, park, museum, restaurant, entertainment, nightlife

    var label: String {
        switch self {
        case .landmark: return "Достопримечательность"
        case .park: return "Парк"
        case .museum: return "Музей"
        case .restaurant: return "Ресторан"
        case .entertainment: return "Развлечения"
        case .nightlife: return "18+ · Ночная жизнь"
        }
    }
    var color: Color {
        switch self {
        case .landmark: return Color(hex: 0xFA3C3C)
        case .park: return Color(hex: 0x378ADD)
        case .museum: return Color(hex: 0xD4537E)
        case .restaurant: return Color(hex: 0xBA7517)
        case .entertainment: return Color(hex: 0x7F77DD)
        case .nightlife: return Color(hex: 0xC04CFF)
        }
    }
}

struct Place: Identifiable {
    let id: Int
    let name: String
    let category: PlaceCategory
    let description: String
    let address: String
    let lat: Double
    let lng: Double
    let price: Int
    let duration: Int
    let rating: Double
    let imageUrl: String
}

// --- Сетевые модели (зеркало ответов api.localee.ru) ---
struct ApiUser: Codable, Identifiable {
    let id: Int
    let handle: String
    let name: String
    var email: String = ""
    let color: String
    let letter: String
    var bio: String = ""
    var city: String = ""
    var avatar: String = ""
    var role: String = "user"
}

struct AuthResponse: Codable {
    let token: String
    let user: ApiUser
}
struct MeResponse: Codable { let user: ApiUser }

struct ChatUser: Codable, Identifiable {
    let id: Int
    let name: String
    let handle: String
    let color: String
    let letter: String
    var avatar: String = ""
    var online: Bool? = nil
}
struct LastMessage: Codable {
    let text: String
    let fromMe: Bool
    let createdAt: String
}
struct ChatListItem: Codable, Identifiable {
    var id: Int { user.id }
    let user: ChatUser
    let last: LastMessage?
    let unread: Int
}
struct ChatListResponse: Codable { let chats: [ChatListItem] }

struct ChatMessage: Codable, Identifiable {
    let id: Int
    let fromMe: Bool
    let text: String
    let createdAt: String
    var edited: Bool = false
}
struct ChatMessagesResponse: Codable {
    let user: ChatUser
    let messages: [ChatMessage]
}
struct SendMessageResponse: Codable { let message: ChatMessage }

struct Post: Codable, Identifiable {
    let id: Int
    let author: ChatUser?
    let text: String
    var image: String = ""
    let createdAt: String
    var likeCount: Int
    var liked: Bool
    var commentCount: Int
    var mine: Bool = false
}
struct FeedResponse: Codable { let posts: [Post] }
struct PostResponse: Codable { let post: Post }
struct LikeResponse: Codable { let liked: Bool; let likeCount: Int }

// --- Метки на карте ---
struct PinAuthor: Codable { let name: String; let handle: String }
struct MapPin: Codable, Identifiable {
    let id: Int
    let kind: String        // "crowd" | "meetup" | "drift"
    let note: String
    let lat: Double
    let lng: Double
    let createdAt: String
    let mine: Bool
    let author: PinAuthor?

    var emoji: String {
        switch kind {
        case "crowd": return "👥"
        case "meetup": return "📣"
        case "drift": return "🏎️"
        default: return "📍"
        }
    }
    var title: String {
        switch kind {
        case "crowd": return "Скопление людей"
        case "meetup": return "Сходка"
        case "drift": return "Дрифт-гонки"
        default: return "Метка"
        }
    }
}
struct PinsResponse: Codable { let pins: [MapPin] }
struct PinResponse: Codable { let pin: MapPin }
struct OkResponse: Codable { let ok: Bool? }

struct ApiErrorBody: Codable { let error: String? }
