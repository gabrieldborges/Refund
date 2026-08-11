import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryWrapper } from "@/test/utils";
import UserAvatar from "./UserAvatar";

function renderAvatar(props: Partial<React.ComponentProps<typeof UserAvatar>> = {}) {
  return render(
    <QueryWrapper>
      <UserAvatar userId={7} name="Ana Souza" {...props} />
    </QueryWrapper>
  );
}

describe("UserAvatar", () => {
  // The initials are not an error state: they are what the app showed before avatars
  // existed, and stay the right answer for somebody without one.
  it("falls back to initials when the user has no avatar", async () => {
    renderAvatar({ hasAvatar: false });

    expect(await screen.findByText("AS")).toBeInTheDocument();
  });

  // hasAvatar={false} must prevent the request entirely — that is the whole point of
  // the payload carrying it. Ten rows without a picture would otherwise be ten 404s.
  it("makes no request when the user is known to have no avatar", async () => {
    let asked = 0;
    server.use(
      http.get("*/users/:id/avatar", () => {
        asked += 1;
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderAvatar({ hasAvatar: false });
    await screen.findByText("AS");

    expect(asked).toBe(0);
  });

  // Asserts the REQUEST, and for the id it should ask about — not the rendered <img>.
  //
  // Radix's AvatarImage only mounts once the image has actually loaded, and jsdom
  // never loads images, so the fallback stays visible no matter what. Same class of
  // limitation as nivo drawing nothing without a layout engine: assert the plumbing,
  // not the pixels.
  it("asks for the URL of the right user when they have an avatar", async () => {
    const asked: string[] = [];
    server.use(
      http.get("*/users/:id/avatar", ({ params }) => {
        asked.push(String(params.id));
        return HttpResponse.json({
          url: "http://localhost/foto.png",
          media_type: "image/png",
        });
      })
    );

    renderAvatar({ hasAvatar: true });

    await waitFor(() => expect(asked).toEqual(["7"]));
  });

  // Unknown is the sidebar's case: the stored session does not carry has_avatar, so
  // asking is the only way to find out.
  it("asks when it does not know whether there is an avatar", async () => {
    let asked = 0;
    server.use(
      http.get("*/users/:id/avatar", () => {
        asked += 1;
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderAvatar();

    await waitFor(() => expect(asked).toBe(1));
    // And a 404 lands on the initials rather than on a broken image.
    expect(await screen.findByText("AS")).toBeInTheDocument();
  });
});

// NÃO há teste para o `object-cover` do AvatarImage, e a ausência é deliberada: o
// AvatarImage do Radix só monta depois que a imagem carrega, e o jsdom nunca carrega
// imagem — então o elemento não existe na árvore para ter a classe inspecionada.
//
// O desvio do registry está registrado no AGENTS.md, junto dos outros dois
// (`Button` sem largura padrão, `Input` precisando de `min-w-0`), que é onde este
// projeto guarda o que não dá para prender em teste.
