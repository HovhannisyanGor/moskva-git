import SwiftUI

struct FeedScreen: View {
    @State private var posts: [Post] = []
    @State private var loading = true
    @State private var newText = ""
    @State private var sending = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    composer
                    if loading {
                        ProgressView().tint(Theme.accent).padding(.top, 40)
                    } else if posts.isEmpty {
                        Text("Пока пусто — напишите первый пост!")
                            .foregroundColor(Theme.text3).padding(.top, 40)
                    } else {
                        ForEach(posts) { post in PostCard(post: post, onLike: { like(post) }) }
                    }
                }
                .padding(14)
            }
            .background(Theme.bg.ignoresSafeArea())
            .navigationTitle("Лента")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Theme.bg, for: .navigationBar)
            .refreshable { await load() }
        }
        .task { await load() }
    }

    private var composer: some View {
        VStack(alignment: .trailing, spacing: 6) {
            TextField("", text: $newText, prompt: Text("Что нового?").foregroundColor(Theme.text3), axis: .vertical)
                .foregroundColor(Theme.text).lineLimit(1...5)
                .frame(maxWidth: .infinity, alignment: .leading)
            Button(action: publish) {
                Text(sending ? "…" : "Опубликовать")
                    .font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                    .padding(.horizontal, 16).padding(.vertical, 9)
                    .background(Theme.accent).clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .opacity(newText.trimmed.isEmpty || sending ? 0.45 : 1)
        }
        .padding(12)
        .background(Theme.card)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func load() async {
        do { posts = try await API.shared.feed() } catch {}
        loading = false
    }
    private func publish() {
        let t = newText.trimmed
        guard !t.isEmpty, !sending else { return }
        sending = true
        Task {
            if let post = try? await API.shared.createPost(text: t) {
                posts.insert(post, at: 0); newText = ""
            }
            sending = false
        }
    }
    private func like(_ post: Post) {
        guard let i = posts.firstIndex(where: { $0.id == post.id }) else { return }
        posts[i].liked.toggle()
        posts[i].likeCount += posts[i].liked ? 1 : -1
        Task {
            if let r = try? await API.shared.like(postId: post.id),
               let j = posts.firstIndex(where: { $0.id == post.id }) {
                posts[j].liked = r.liked; posts[j].likeCount = r.likeCount
            }
        }
    }
}

struct PostCard: View {
    let post: Post
    let onLike: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                AvatarView(avatar: post.author?.avatar ?? "", color: post.author?.color ?? "#888",
                           letter: post.author?.letter ?? "?", size: 40)
                VStack(alignment: .leading, spacing: 1) {
                    Text(post.author?.name ?? "Пользователь")
                        .font(.system(size: 15, weight: .bold)).foregroundColor(Theme.text)
                    Text("@\(post.author?.handle ?? "") · \(timeAgo(post.createdAt))")
                        .font(.system(size: 13)).foregroundColor(Theme.text3)
                }
                Spacer()
            }
            if !post.text.isEmpty {
                Text(post.text).font(.system(size: 15.5)).foregroundColor(Theme.text).lineSpacing(3)
            }
            if !post.image.isEmpty, let url = URL(string: post.image) {
                AsyncImage(url: url) { $0.resizable().scaledToFill() } placeholder: { Theme.bg2 }
                    .frame(height: 240).frame(maxWidth: .infinity).clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            HStack(spacing: 22) {
                Button(action: onLike) {
                    Text("\(post.liked ? "♥" : "♡") \(post.likeCount)")
                        .foregroundColor(post.liked ? Theme.accent : Theme.text2)
                }
                Text("💬 \(post.commentCount)").foregroundColor(Theme.text2)
            }
            .font(.system(size: 15, weight: .semibold))
        }
        .padding(14)
        .background(Theme.card)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 0.5))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
