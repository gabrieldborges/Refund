import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Text from "../components/atoms/Text";
import Icon from "../components/atoms/Icon";
import InputText from "../components/molecules/InputText";
import Button from "../components/molecules/Button";
import ReceiptIcon from "../assets/icons/Receipt.svg?react";
import { useAuth } from "../context/useAuth";
import { getApiErrorMessage } from "../lib/api";

export default function PageLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-app flex items-center justify-center py-10 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-lg p-8 flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <Icon svg={ReceiptIcon} className="w-8 h-8 fill-accent" />
          <Text as="h1" variant="heading-medium" className="text-accent">
            refund
          </Text>
        </div>

        <InputText
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <InputText
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && (
          <Text variant="paragraph-medium" className="text-error">
            {error}
          </Text>
        )}

        <Button type="submit" variant="primary" handling={isSubmitting} disabled={isSubmitting}>
          Entrar
        </Button>

        <Text variant="paragraph-medium" className="text-muted text-center">
          Não tem uma conta?{" "}
          <Link to="/register" className="text-accent font-semibold">
            Cadastre-se
          </Link>
        </Text>
      </form>
    </div>
  );
}
