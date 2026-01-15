import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

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
    <img
      src={dataUrl}
      alt={alt}
      className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
      {...props}
    />
  );
};
