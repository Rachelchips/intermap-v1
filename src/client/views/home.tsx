import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../trpc";
import { BadgeIcon, PartyPopperIcon, SparkleIcon } from "lucide-react";

export function HomePage() {
  const serverTimeQuery = useQuery(trpc.example.getServerTime.queryOptions());
  const greetingsQuery = useQuery(trpc.example.getGreetings.queryOptions());
  const queryClient = useQueryClient();
  const addGreeting = useMutation(
    trpc.example.addGreeting.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.example.getGreetings.queryKey(),
        });
      },
    })
  );

  return (
    <div className="w-screen h-screen flex items-center justify-center flex-col bg-background/5">
      <div className="overflow-hidden text-center border border-black/12 p-10 rounded-[10px] bg-white relative min-h-[20vh]">
        <div
          className="absolute left-0 top-0 size-10 blur-sm rounded-full opacity-30 animate-[move_3s_ease_infinite_alternate-reverse_1s]"
          style={{
            background:
              "linear-gradient(90deg, rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)",
          }}
        />
        <div
          className="absolute right-0 top-0 size-10 blur-sm rounded-full opacity-30 animate-[move_3s_ease_infinite_alternate-reverse_2s]"
          style={{
            background:
              "linear-gradient(90deg, rgba(131, 58, 180, 1) 0%, rgba(253, 29, 29, 1) 50%, rgba(252, 176, 69, 1) 100%)",
          }}
        />
        <div
          className="absolute right-0 bottom-0 size-10 blur-sm rounded-full opacity-5 animate-[move_3s_ease_infinite_alternate-reverse_2s]"
          style={{
            background: "linear-gradient(160deg, #0093e9 0%, #80d0c7 100%);",
          }}
        />
        <div
          className="absolute left-0 bottom-0 size-10 blur-sm rounded-full opacity-5 animate-[move_3s_ease_infinite_alternate-reverse_2s]"
          style={{
            background: "linear-gradient(45deg, #85ffbd 0%, #fffb7d 100%);",
          }}
        />

        <PartyPopperIcon className="absolute right-0 bottom-0 size-20 opacity-5" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex justify-center">
            <BadgeIcon
              className="animate-spin"
              style={{
                animationDuration: "5s",
              }}
            />
          </div>
          <div className="text-xs my-2 opacity-60 font-light">
            step1.dev starter
          </div>
          <h1 className="text-lg font-bold mb-5">Blank Project</h1>

          <div className="mt-4 text-xs rounded-full opacity-60 font-light">
            <SparkleIcon size={12} className="inline mr-1 -mt-0.5" />
            <span>Tell Step1 AI what to do next.</span>
          </div>
          <button
            className="mt-3 px-3 py-1 text-xs border rounded-md hover:bg-black/5 transition-colors disabled:opacity-50"
            onClick={() => addGreeting.mutate({ message: `Hi #${(greetingsQuery.data?.length ?? 0) + 1}` })}
            disabled={addGreeting.isPending}
          >
            {addGreeting.isPending ? "Sending..." : `Say Hi (${greetingsQuery.data?.length ?? 0})`}
          </button>
          <p className="opacity-20 font-light text-xs text-center mt-2">
            {serverTimeQuery.isLoading
              ? "Loading server time..."
              : serverTimeQuery.isError
                ? "Failed to load server time"
                : `Server Time: ${serverTimeQuery.data}`}
          </p>
        </div>
      </div>
    </div>
  );
}
