import type { Experimental_GeneratedImage } from "ai";
import NextImage from "next/image";
import { cn } from "@/lib/utils";

export type ImageProps = Experimental_GeneratedImage & {
  readonly className?: string;
  readonly alt?: string;
};

export const Image = ({
  base64,
  mediaType,
  alt = "Generated image",
  className,
  ...props
}: ImageProps) => {
  const dataUrl = `data:${mediaType};base64,${base64}`;

  return (
    <NextImage
      src={dataUrl}
      alt={alt}
      className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
      width={500}
      height={500}
      {...props}
    />
  );
};
