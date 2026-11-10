// Right-hand pane on desktop when no chat is open. (On phones the list fills the screen instead.)
export default function MessagesHome() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <p className="text-lg font-semibold">Your messages</p>
        <p className="mt-1 text-sm opacity-60">Pick a conversation, or message someone from their profile.</p>
      </div>
    </div>
  );
}
