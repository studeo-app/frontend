export type DefaultProfileAvatar = {
  id: string;
  src: string;
};

/** Avatares por defecto hospedados en Cloudinary para garantizar URLs válidas en el registro. */
export const DEFAULT_PROFILE_AVATARS: DefaultProfileAvatar[] = [
  {
    id: "default-1",
    src: "https://res.cloudinary.com/dnrpqenrg/image/upload/v1780046993/default_profile_1_brmprw.png",
  },
  {
    id: "default-2",
    src: "https://res.cloudinary.com/dnrpqenrg/image/upload/v1780046993/default_profile_2_qybesw.png",
  },
  {
    id: "default-3",
    src: "https://res.cloudinary.com/dnrpqenrg/image/upload/v1780046992/default_profile_3_dtfnon.png",
  },
  {
    id: "default-4",
    src: "https://res.cloudinary.com/dnrpqenrg/image/upload/v1780046992/default_profile_4_hiv2ql.png",
  },
  {
    id: "default-5",
    src: "https://res.cloudinary.com/dnrpqenrg/image/upload/v1780046993/default_profile_5_xxv5yp.png",
  },
];

