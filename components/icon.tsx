export function Icon({ name, className = "size-5" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-current ${className}`}
      style={{
        mask: `url(/icons/${name}.svg) center / contain no-repeat`,
        WebkitMask: `url(/icons/${name}.svg) center / contain no-repeat`,
      }}
    />
  );
}
