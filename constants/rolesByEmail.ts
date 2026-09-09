export type UserRole =
    | "super_admin"
    | "admin_aplikasi"
    | "admin_finance"
    | "admin_art_babysitter";

export const EMAIL_ROLE_MAP: Record<string, UserRole> = {
    "superadmin@gmail.com": "super_admin",
    "adminaplikasi@gmail.com": "admin_aplikasi",
    "adminfinance@gmail.com": "admin_finance",
    "cicana.co@gmail.com": "admin_art_babysitter",
};

export const ROLE_TABS: Record<UserRole, string[]> = {
    super_admin: ["index", "myapps", "art-order", "reports", "orders", "profile", "withdraw"],
    admin_aplikasi: ["myapps", "profile"],
    admin_finance: ["reports", "orders", "profile", "withdraw"],
    admin_art_babysitter: ["art-order"], // <-- PASTIKAN "profile" TIDAK ADA DI SINI
};

export function getRoleByEmail(email: string): UserRole | null {
    return EMAIL_ROLE_MAP[email.toLowerCase().trim()] ?? null;
}

export function canAccessTab(email: string, tab: string): boolean {
    const role = getRoleByEmail(email);
    if (!role) return false;
    return ROLE_TABS[role].includes(tab);
}