import SwiftUI

@main
struct rutinasApp: App {
    init() {
        registerGeistFonts()
        UINavigationBar.appearance().isHidden = true
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
