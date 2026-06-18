import Button from "../components/atoms/Button";
import Text from "../components/atoms/Text";
import ButtonIcon from "../components/atoms/ButtonIcon";
import MagnifyingGlassIcon from "../assets/icons/MagnifyingGlass.svg?react";
import InputText from "../components/atoms/InputText";

export default function PageComponents() {
  return (
    <div className="w-full h-screen flex flex-col gap-4 items-center ">
      <Text variant="heading-large">Component Page</Text>
      <div className="w-full flex items-center justify-center gap-4">
        <Button variant="primary">Primary Button</Button>
        <Button variant="primary" disabled>
          Disabled Button
        </Button>
        <Button variant="primary" disabled handling>
          Disabled Button
        </Button>
      </div>
      <div className="w-full flex items-center justify-center gap-4">
        <ButtonIcon variant="primary" icon={MagnifyingGlassIcon}>Primary Icon Button</ButtonIcon>
        <ButtonIcon variant="primary" disabled icon={MagnifyingGlassIcon}>Primary Icon Button</ButtonIcon>
        <ButtonIcon variant="primary" disabled handling icon={MagnifyingGlassIcon}>Primary Icon Button</ButtonIcon>
        
      </div>
      <div className="w-full flex items-center justify-center gap-4">
        <InputText placeholder="Placeholder" label="Label" />
        <InputText placeholder="Placeholder" label="Label" error="Error" />
        <InputText placeholder="Placeholder" label="Label" disabled />
      </div>
    </div>
  );
}
