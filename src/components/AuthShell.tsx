import BrandLogo from "./BrandLogo";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="flex flex-col justify-center gap-4 bg-navy-900 px-8 py-12 md:w-1/2 md:px-16">
        <BrandLogo variant="reversed" className="text-2xl" />
        <p className="max-w-sm text-lg text-navy-100">Safer people. Stronger business.</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#F7F7F7] px-8 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
