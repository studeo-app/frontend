import React, { useId, useMemo, useRef, useState } from "react";
import { AdvancedImage } from "@cloudinary/react";
import { Loader2, Plus } from "lucide-react";
import { DEFAULT_PROFILE_AVATARS } from "@/assets/defaultProfileAvatars";
import { isCloudinaryAssetUrl } from "@/config/cloudinary.config";
import {
  buildAvatarCloudinaryImage,
  resolveCloudinaryAvatarErrorMessage,
} from "@/modules/media/cloudinary";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { useCloudinaryAvatarUpload } from "../hooks/useCloudinaryAvatarUpload";
import { AvatarCarouselStrip } from "./AvatarCarouselStrip";

export type AvatarCarouselItem = {
  id: string;
  src: string;
  kind: "default" | "google" | "upload";
  publicId?: string;
};

const KIND_ORDER: Record<AvatarCarouselItem["kind"], number> = {
  upload: 0,
  google: 1,
  default: 2,
};

function sortCarouselItems(items: AvatarCarouselItem[]): AvatarCarouselItem[] {
  return [...items].sort((a, b) => {
    const byKind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (byKind !== 0) return byKind;

    if (a.kind === "upload" && b.kind === "upload") {
      const numA = Number.parseInt(a.id.replace("upload-", ""), 10);
      const numB = Number.parseInt(b.id.replace("upload-", ""), 10);
      return numB - numA;
    }

    return 0;
  });
}

function buildInitialItems(initialExternalUrl?: string, currentValue?: string): AvatarCarouselItem[] {
  const defaults: AvatarCarouselItem[] = DEFAULT_PROFILE_AVATARS.map(
    (avatar) => ({
      id: avatar.id,
      src: avatar.src,
      kind: "default",
    })
  );

  const items: AvatarCarouselItem[] = [];
  const external = initialExternalUrl?.trim();
  const current = currentValue?.trim();

  if (current && current !== external && !defaults.some((item) => item.src === current)) {
    items.push({ id: "current-avatar", src: current, kind: "upload" });
  }

  if (external && !defaults.some((item) => item.src === external)) {
    items.push({ id: "google", src: external, kind: "google" });
  }

  items.push(...defaults);
  return sortCarouselItems(items);
}

function AvatarThumb({
  src,
  alt,
  publicId,
  selected,
  onClick,
  disabled,
}: {
  src: string;
  alt: string;
  publicId?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cloudinaryImage = useMemo(() => {
    if (publicId) {
      return buildAvatarCloudinaryImage(src, publicId);
    }
    if (isCloudinaryAssetUrl(src)) {
      return buildAvatarCloudinaryImage(src);
    }
    return null;
  }, [src, publicId]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        relative h-[3.25rem] w-[3.25rem] shrink-0 snap-center overflow-hidden rounded-full border-2 transition-all duration-200
        disabled:pointer-events-none disabled:opacity-50
        ${
          selected
            ? "border-auth-btn shadow-md shadow-auth-btn/25"
            : "border-transparent opacity-85 hover:opacity-100"
        }
      `}
    >
      {cloudinaryImage ? (
        <AdvancedImage
          cldImg={cloudinaryImage}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </button>
  );
}

interface ProfileAvatarCarouselProps {
  displayName: string;
  userId?: string;
  initialExternalUrl?: string;
  value: string;
  disabled?: boolean;
  onChange: (payload: { secureUrl: string; publicId?: string }) => void;
}

export const ProfileAvatarCarousel: React.FC<ProfileAvatarCarouselProps> = ({
  displayName,
  userId,
  initialExternalUrl = "",
  value,
  disabled = false,
  onChange,
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCounter = useRef(0);

  const [items, setItems] = useState<AvatarCarouselItem[]>(() =>
    buildInitialItems(initialExternalUrl, value)
  );
  const [uploadErrorOpen, setUploadErrorOpen] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");

  const { isUploading, uploadAvatar, clearUploadError } =
    useCloudinaryAvatarUpload({ userId });

  const sortedItems = useMemo(() => sortCarouselItems(items), [items]);

  const selectedId = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed) {
      const match = sortedItems.find((item) => item.src === trimmed);
      if (match) return match.id;
    }
    const googleItem = sortedItems.find((item) => item.kind === "google");
    if (googleItem) return googleItem.id;
    return sortedItems[0]?.id ?? "";
  }, [value, sortedItems]);

  const selectedItem =
    sortedItems.find((item) => item.id === selectedId) ?? sortedItems[0] ?? null;

  const previewSrc = selectedItem?.src ?? value;

  const previewCloudinary = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.publicId) {
      return buildAvatarCloudinaryImage(previewSrc, selectedItem.publicId);
    }
    if (isCloudinaryAssetUrl(previewSrc)) {
      return buildAvatarCloudinaryImage(previewSrc);
    }
    return null;
  }, [previewSrc, selectedItem]);

  const showUploadError = (error: unknown) => {
    setUploadErrorMessage(resolveCloudinaryAvatarErrorMessage(error));
    setUploadErrorOpen(true);
  };

  const closeUploadError = () => {
    setUploadErrorOpen(false);
    clearUploadError();
  };

  const selectItem = (item: AvatarCarouselItem) => {
    onChange({ secureUrl: item.src, publicId: item.publicId });
  };

  const handlePickFile = () => {
    if (disabled || isUploading) return;
    clearUploadError();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const result = await uploadAvatar(file);
      uploadCounter.current += 1;
      const newItem: AvatarCarouselItem = {
        id: `upload-${uploadCounter.current}`,
        src: result.secureUrl,
        kind: "upload",
        publicId: result.publicId,
      };

      setItems((prev) => sortCarouselItems([...prev, newItem]));
      onChange({ secureUrl: result.secureUrl, publicId: result.publicId });
    } catch (err) {
      showUploadError(err);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="relative inline-block">
          <div
            className="
              h-32 w-32
              overflow-hidden
              rounded-full
              border-[3px]
              border-auth-btn/60
              bg-auth-input-bg
              shadow-xl
              shadow-auth-btn/15
            "
          >
            {previewCloudinary ? (
              <AdvancedImage
                cldImg={previewCloudinary}
                alt={`Avatar de ${displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={previewSrc}
                alt={`Avatar de ${displayName}`}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {isUploading && (
            <div
              className="
                absolute
                inset-0
                flex
                items-center
                justify-center
                rounded-full
                bg-auth-bg/70
              "
              aria-hidden="true"
            >
              <Loader2 className="h-9 w-9 animate-spin text-auth-btn" />
            </div>
          )}

          <button
            type="button"
            onClick={handlePickFile}
            disabled={disabled || isUploading}
            aria-label="Añadir foto de perfil"
            className="
              absolute
              bottom-0
              right-0
              z-10
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border-2
              border-auth-input-border
              bg-auth-btn
              text-auth-btn-text
              shadow-md
              transition-all
              duration-200
              hover:brightness-110
              active:scale-95
              disabled:pointer-events-none
              disabled:opacity-50
            "
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </button>

          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
        </div>

        <div className="w-full min-w-0 self-stretch">
          <AvatarCarouselStrip itemCount={sortedItems.length}>
            {sortedItems.map((item) => (
            <AvatarThumb
              key={item.id}
              src={item.src}
              alt={`Opción de avatar ${item.kind}`}
              publicId={item.publicId}
              selected={item.id === selectedId}
              disabled={disabled || isUploading}
              onClick={() => selectItem(item)}
            />
            ))}
          </AvatarCarouselStrip>
        </div>
      </div>

      <ErrorModal
        isOpen={uploadErrorOpen}
        onClose={closeUploadError}
        title="Ha ocurrido un error al cargar el avatar"
        message={uploadErrorMessage}
      />
    </>
  );
};
