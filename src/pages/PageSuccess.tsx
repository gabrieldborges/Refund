import { useNavigate } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import Button from "../components/molecules/Button";
import CheckIcon from "../assets/icons/Check.svg?react";

export default function PageSuccess() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-gray-500 flex justify-center py-10 px-4">
      <div className="w-full max-w-md h-fit bg-white rounded-lg p-8 flex flex-col items-center gap-4 text-center">
        <Text as="h1" variant="heading-medium">
          Solicitação enviada!
        </Text>
        <span className="w-20 h-20 rounded-full border-4 border-green-100 flex items-center justify-center">
          <Icon svg={CheckIcon} className="w-10 h-10 fill-green-100" />
        </span>
        <Text variant="paragraph-medium" className="text-gray-200">
          Agora é apenas aguardar! Sua solicitação será analisada e, em breve, o
          setor financeiro irá entrar em contato com você.
        </Text>
        {/* Reabrir o modal direto daqui pede estado compartilhado entre
            páginas — fica pra quando entrarmos na sub-fase de contexts. Por
            enquanto, só volta pra Home. */}
        <Button variant="primary" onClick={() => navigate("/")}>
          Nova solicitação
        </Button>
      </div>
    </div>
  );
}
