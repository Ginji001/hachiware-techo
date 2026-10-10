"use client";

type PrintButtonProps = {
  className?: string;
  label?: string;
};

export function PrintButton({
  className = "",
  label = "PDF・印刷",
}: PrintButtonProps) {
  return (
    <button
      type="button"
      className={`print-button ${className}`.trim()}
      title="印刷画面で「PDFに保存」を選べます"
      onClick={() => window.print()}
    >
      <span aria-hidden="true">PDF</span>
      {label}
    </button>
  );
}
