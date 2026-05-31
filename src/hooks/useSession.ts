import { useEffect, useState } from "react";
import { storage } from "../utils/storage";

export function useSession() {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        storage.get("userData")
            .then((val) => {
                if (!mounted) return;
                if (val) {
                    try {
                        const user = JSON.parse(val);
                        setEmail(user.email ?? null);
                    } catch {
                        setEmail(null);
                    }
                } else {
                    setEmail(null);
                }
            })
            .catch(() => {
                if (mounted) setEmail(null);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, []);

    return { email, loading };
}