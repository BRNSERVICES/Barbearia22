import Image from "next/image";

export function Logo({ width = 160, priority = false }: { width?: number; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="Barbearia 22"
      width={width}
      height={Math.round((width * 697) / 900)}
      priority={priority}
      className="h-auto"
    />
  );
}
