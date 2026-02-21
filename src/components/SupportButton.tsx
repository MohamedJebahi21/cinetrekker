type SupportButtonProps = {
  href?: string;
  className?: string;
};

export function SupportButton({
  href = "https://buymeacoffee.com/mohamed_jebahi",
  className = "",
}: SupportButtonProps) {
  return (
    <div className={`flex justify-center md:justify-start ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground shadow-card backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-primary/70 hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label="Buy Me a Coffee"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 10C4 8.89543 4.89543 8 6 8H14C15.1046 8 16 8.89543 16 10V13C16 16.3137 13.3137 19 10 19C6.68629 19 4 16.3137 4 13V10Z"
            fill="currentColor"
          />
          <path
            d="M16 10H17.5C18.8807 10 20 11.1193 20 12.5C20 13.8807 18.8807 15 17.5 15H16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 5C8 5 7 6 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M11 5C11 5 10 6 10 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 5C14 5 13 6 13 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>Buy Me a Coffee</span>
      </a>
    </div>
  );
}

export default SupportButton;
