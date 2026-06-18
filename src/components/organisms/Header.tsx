import NavLink from "../../components/atoms/NavLink";

export default function Header() {
  return (
    <header className="w-full h-16 bg-primary-brand flex items-center gap-3 justify-between  my-auto text-center">
      <h1 className="text-2xl font-bold">Refund</h1>
      <div className="flex items-center gap-3">
        <NavLink to="/" >Home</NavLink>
        <NavLink to="/components" >Components</NavLink>
      </div>
    </header>
  );
}