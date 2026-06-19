import React, { useMemo } from "react";
import { AdvancedImage } from "@cloudinary/react";
import { isCloudinaryAssetUrl } from "@/config/cloudinary.config";
import { buildAvatarCloudinaryImage } from "@/modules/media/cloudinary";

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-24 w-24",
} as const;

interface UserAvatarProps {
  src?: string | null;
  alt: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size = "md",
  className = "",
  fetchPriority = "auto",
}) => {
  const imageSrc = src?.trim() ?? "";

  const cloudinaryImage = useMemo(() => {
    if (!imageSrc || !isCloudinaryAssetUrl(imageSrc)) return null;
    return buildAvatarCloudinaryImage(imageSrc);
  }, [imageSrc]);

  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`
        ${sizeClass}
        shrink-0 overflow-hidden rounded-full
        border-2 border-auth-btn/40 bg-auth-input-bg
        ${className}
      `}
    >
      {cloudinaryImage ? (
        <AdvancedImage
          cldImg={cloudinaryImage}
          alt={alt}
          fetchPriority={fetchPriority}
          loading={fetchPriority === "high" ? "eager" : undefined}
          className="h-full w-full object-cover"
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          fetchPriority={fetchPriority}
          loading={fetchPriority === "high" ? "eager" : undefined}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-auth-btn/20 text-sm font-semibold text-auth-btn"
          aria-hidden="true"
        >
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};
