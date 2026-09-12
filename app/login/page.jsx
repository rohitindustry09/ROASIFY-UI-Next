import AuthPanel from "@/components/AuthPanel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="stagger w-full max-w-[400px]">
        <div
          className="mb-6 flex min-h-[64px] items-center justify-center rounded-[20px] px-4 py-5"
          style={{ background: "linear-gradient(160deg, #4E66B9, #93ABDE)" }}
        >
          <span
            className="text-[22px] font-normal tracking-[.01em] text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            roasify
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-card p-8 shadow-[0_1px_2px_rgba(20,30,80,.03)]">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
