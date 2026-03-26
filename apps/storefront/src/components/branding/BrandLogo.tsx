import { readFileSync } from "node:fs";
import path from "node:path";
import { useId, type ComponentPropsWithoutRef } from "react";

type BrandLogoProps = Omit<
    ComponentPropsWithoutRef<"span">,
    "children" | "dangerouslySetInnerHTML" | "role" | "aria-hidden" | "aria-label"
> & {
    decorative?: boolean;
    label?: string;
};

const BRAND_LOGO_SOURCE_PATH = path.resolve(process.cwd(), "public/images/logos/CLA.svg");

const buildThemeableBrandLogo = (source: string) =>
    source
        .replace(/<\?xml[^>]*>\s*/i, "")
        .replace(/<!--([\s\S]*?)-->/g, "")
        .replace(/\s+xml:space="[^"]*"/g, "")
        .replace(/\s+xmlns(:svg)?="[^"]*"/g, "")
        .replace(/\s+width="[^"]*"/i, "")
        .replace(/\s+height="[^"]*"/i, "")
        .replace(
            /<svg\b/,
            '<svg class="cla-brand-logo-svg" style="display:block;width:100%;height:auto" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"',
        )
        .replace(/fill="#004825"/gi, 'fill="var(--brand-logo-bg, transparent)"')
        .replace(/fill="#ffffff"/gi, 'fill="var(--brand-logo-fg, currentColor)"')
        .replace('id="74c57b0ffb-6"', 'id="__CLA_BRAND_CLIP__"')
        .replace('clip-path="url(#74c57b0ffb-6)"', 'clip-path="url(#__CLA_BRAND_CLIP__)"')
        .replace(/\sid="(?!__CLA_BRAND_CLIP__)[^"]+"/g, "")
        .replace(/>\s+</g, "><")
        .replace(/\s{2,}/g, " ")
        .trim();

const BRAND_LOGO_MARKUP = buildThemeableBrandLogo(readFileSync(BRAND_LOGO_SOURCE_PATH, "utf8"));

export default function BrandLogo({
    decorative = false,
    label = "CLA Soulprint",
    className,
    style,
    ...props
}: BrandLogoProps) {
    const clipPathId = useId().replace(/:/g, "");
    const markup = BRAND_LOGO_MARKUP.replaceAll("__CLA_BRAND_CLIP__", clipPathId);

    return (
        <span
            {...props}
            className={className}
            style={{
                display: "inline-block",
                lineHeight: 0,
                verticalAlign: "middle",
                ...style,
            }}
            role={decorative ? undefined : "img"}
            aria-label={decorative ? undefined : label}
            aria-hidden={decorative || undefined}
            dangerouslySetInnerHTML={{ __html: markup }}
        />
    );
}
