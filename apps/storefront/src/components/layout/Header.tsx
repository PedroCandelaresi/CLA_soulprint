import BrandLogo from "@/components/branding/BrandLogo";
import HeaderClient from "./HeaderClient";

export default function Header() {
    return (
        <HeaderClient
            headerLogo={<BrandLogo label="CLA Soulprint" />}
            drawerLogo={<BrandLogo label="CLA Soulprint" />}
            drawerDecorativeLogo={<BrandLogo decorative />}
        />
    );
}
