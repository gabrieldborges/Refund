import Button from "../components/molecules/Button";
import Text from "../components/atoms/Text";
import ButtonIcon from "../components/molecules/ButtonIcon";
import MagnifyingGlassIcon from "../assets/icons/MagnifyingGlass.svg?react";
import InputText from "../components/molecules/InputText";
import PopOverMenu from "../components/molecules/PopOverMenu";
import InputLabelWrapper from "../components/molecules/InputLabelWrapper";
import { CATEGORY_OPTIONS } from "../constants/categories";

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
      <div className="flex  w-full gap-4">
        <InputText placeholder="Placeholder" label="Label" icon={MagnifyingGlassIcon}/>
        <InputText placeholder="Placeholder" label="Label" error="Error" />
        <InputText placeholder="Placeholder" label="Label" disabled />
      </div>
      <PopOverMenu options={CATEGORY_OPTIONS} />
      <InputLabelWrapper label="Label" icon={MagnifyingGlassIcon}>
      </InputLabelWrapper>
    </div>
  );
}
