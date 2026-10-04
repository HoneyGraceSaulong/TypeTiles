import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayerAuth } from "../lib/PlayerAuthContext";

const settingsItems = ["Account Settings", "Notifications", "Help & Support", "About Type Tiles", "Feedback"];

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = usePlayerAuth();

  const signOut = () => {
    logout();
    navigate("/welcome", { replace: true });
  };

  return (
    <section className="h-full overflow-y-auto" data-node-id="440:2197">
      <div className="min-h-[735px] rounded-[8px] bg-[linear-gradient(197deg,#08122e_17%,rgba(43,51,89,.9)_46%,#13173b_81%)] px-6 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-medium text-white">Settings</h1>
          <button type="button" onClick={() => navigate("/app/customize")} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Back to profile">
            <ChevronRight className="h-7 w-7 rotate-180" />
          </button>
        </div>
        <div className="mt-10 max-w-[998px]">
          {settingsItems.map((item) => (
            <div key={item} className="flex h-[85px] items-start justify-between border-b border-transparent pt-1 text-[20px] font-medium text-white">
              <span>{item}</span>
              <ChevronRight className="mt-1 h-6 w-6" />
            </div>
          ))}
        </div>
        <button type="button" onClick={signOut} className="mx-auto mt-4 block h-[60px] w-full max-w-[420px] rounded-[8px] bg-[#2746a6] text-[22px] font-medium text-white transition hover:brightness-110">Sign Out</button>
      </div>
    </section>
  );
}