export const initializeTheme = () => {
    // Set navigation theme to dark
    document.documentElement.classList.add("app-navigation-dark");
    localStorage.setItem("navigationTheme", "dark");

    // Set header theme to dark
    document.documentElement.classList.add("app-header-dark");
    localStorage.setItem("headerTheme", "dark");

    // Set skin theme to dark
    document.documentElement.classList.add("app-skin-light");
    localStorage.setItem("skinTheme", "light");

    // Set font family
    const existingFont = localStorage.getItem("fontFamily") || "app-font-family-inter";

    // Remove existing font classes
    const existingFontClass = document.documentElement.classList.value.match(/app-font-family-\w+/);
    if (existingFontClass) {
        document.documentElement.classList.remove(existingFontClass[0]);
    }

    // Add selected font
    document.documentElement.classList.add(existingFont);
    localStorage.setItem("fontFamily", existingFont);
};

// Optional: Function to load saved theme settings
export const loadSavedTheme = () => {
    const savedNavigationTheme = localStorage.getItem("navigationTheme");
    const savedHeaderTheme = localStorage.getItem("headerTheme");
    const savedSkinTheme = localStorage.getItem("skinTheme");
    const savedFontFamily = localStorage.getItem("fontFamily");

    if (savedNavigationTheme === "dark") {
        document.documentElement.classList.add("app-navigation-dark");
    }

    if (savedHeaderTheme === "dark") {
        document.documentElement.classList.add("app-header-dark");
    }

    if (savedSkinTheme === "dark") {
        document.documentElement.classList.add("app-skin-dark");
    }

    if (savedFontFamily) {
        const existingFontClass = document.documentElement.classList.value.match(/app-font-family-\w+/);
        if (existingFontClass) {
            document.documentElement.classList.remove(existingFontClass[0]);
        }
        document.documentElement.classList.add(savedFontFamily);
    } else {
        document.documentElement.classList.add("app-font-family-inter");
    }
}