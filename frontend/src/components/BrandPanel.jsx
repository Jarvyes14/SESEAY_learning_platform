import { usePlatform } from "../context/PlatformContext.jsx";
import { assetUrl } from "../lib/api.js";
import Logo from "./Logo.jsx";

export default function BrandPanel() {
  const { platform } = usePlatform();
  const { login } = platform.branding;
  return <aside className="relative hidden min-w-0 items-center overflow-hidden bg-primary p-8 text-inverse lg:flex xl:p-12">
    {login.imageUrl && <><img src={assetUrl(login.imageUrl)} alt="" className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-primary/85" /></>}
    <div className="relative mx-auto max-w-xl"><Logo inverse /><h2 className="mt-7 font-display text-3xl font-bold xl:text-4xl">{login.title}</h2><p className="mt-5 text-lg leading-8 text-inverse/80">{login.description}</p></div>
  </aside>;
}
