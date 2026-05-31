import { createContext, useContext } from "react";
import { UserRole } from "../../constants/rolesByEmail";

interface SessionContextType {
    email: string;
    role: UserRole;
    can: (tab: string) => boolean;
}

export const SessionContext = createContext<SessionContextType | null>(null);

export function useSessionContext() {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSessionContext harus dipakai dalam TabLayout");
    return ctx;
}