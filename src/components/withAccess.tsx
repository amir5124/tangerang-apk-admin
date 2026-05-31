import React from "react";
import { useSessionContext } from "../context/SessionContext";
import UnauthorizedScreen from "./UnauthorizedScreen";

export function withAccess(tabName: string, Component: React.ComponentType<any>) {
    return function ProtectedScreen(props: any) {
        const { can } = useSessionContext();

        if (!can(tabName)) {
            return <UnauthorizedScreen pageName={tabName} />;
        }

        return <Component {...props} />;
    };
}