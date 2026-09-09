// Additional search material. The original 80-note corpus stays frozen in
// collections.js for the recorded encoder comparison.
import { collections as original } from "./collections.js";
const note = (id, title, group, text) => ({ id, title, group, text });
const added = {
  "field-notes": [
    note(
      "f41",
      "Shade at the bus stop",
      "Living cities",
      "A shelter above the bus queue blocks afternoon sun and sudden rain. Seating and clear route information make the wait more comfortable, especially for older riders.",
    ),
    note(
      "f42",
      "A safe place to cross",
      "Living cities",
      "A raised pedestrian crossing slows approaching traffic. Shorter crossing distances and a refuge island let people cross a busy street in two manageable stages.",
    ),
    note(
      "f43",
      "A bicycle that stays dry",
      "Living cities",
      "Covered bicycle parking near the entrance makes riding to work easier. A secure place to lock the frame matters as much as a painted bicycle lane.",
    ),
    note(
      "f44",
      "Frequent buses need no timetable",
      "Living cities",
      "A bus that arrives every few minutes lets passengers leave home when they are ready. Reliable frequency can make a car-free daily trip practical.",
    ),
    note(
      "f45",
      "Keep rain where it falls",
      "Living cities",
      "Permeable paving lets a courtyard absorb rainfall between its stones. A planted strip beside the pavement gives overflow somewhere to spread during a heavy storm.",
    ),
    note(
      "f46",
      "Choose a useful shared tool",
      "Shared things",
      "Before buying equipment for a neighborhood workshop, ask what members need repeatedly. Spare batteries and clear borrowing records can be more useful than another expensive machine.",
    ),
    note(
      "f47",
      "Repair instructions beside the object",
      "Shared things",
      "A printed repair guide kept with an appliance helps its next owner replace a worn part. A standard screw is easier to open than a permanently glued case.",
    ),
    note(
      "f48",
      "A place for surplus food",
      "Shared things",
      "A community refrigerator gives neighbors somewhere to leave clearly labeled spare food. Regular cleaning and a simple check-in routine keep the shared space usable.",
    ),
    note(
      "f49",
      "Learn by fixing it together",
      "Shared things",
      "A repair session works best when the owner holds the screwdriver while a volunteer explains the next step. The result is a working object and a person who understands it.",
    ),
    note(
      "f50",
      "Trade skills across generations",
      "Shared things",
      "An older gardener teaches seed saving while a younger neighbor helps scan family photographs. Sharing knowledge can be a useful exchange even when nobody pays money.",
    ),
    note(
      "f51",
      "Leave a restart note",
      "Attention",
      "Before stopping a difficult task, write the next concrete action and the file you need. That small reminder reduces the time spent reconstructing your thinking tomorrow.",
    ),
    note(
      "f52",
      "Put messages in a window",
      "Attention",
      "Checking messages at a few planned times protects a longer block of focused work. Keep an urgent contact route available so every notification does not demand immediate attention.",
    ),
    note(
      "f53",
      "Give a meeting one decision",
      "Attention",
      "Write the decision a meeting needs to make before inviting people. Share background material beforehand, then end with an owner and a next step.",
    ),
    note(
      "f54",
      "A checklist for the repeated part",
      "Attention",
      "A short checklist catches routine omissions when attention is tired. It is most useful for recurring steps that should happen the same way every time.",
    ),
    note(
      "f55",
      "Record who is in the photograph",
      "Memory & craft",
      "When scanning a family photograph, record names, approximate date, and location beside the image. Future viewers cannot recover those details from a filename such as scan0042.",
    ),
    note(
      "f56",
      "Try restoring a backup",
      "Memory & craft",
      "Copying files is only half of a backup routine. Restore a few documents onto another device to check that the saved copy is readable and complete.",
    ),
    note(
      "f57",
      "Keep the original recording",
      "Memory & craft",
      "Save an untouched copy of an audio interview before cleaning noise or trimming pauses. Future editing decisions are easier when the original performance still exists.",
    ),
    note(
      "f58",
      "Flowers through the whole season",
      "Living systems",
      "Plant species with different flowering months so pollinators can find nectar from spring into autumn. A short spectacular bloom leaves a long hungry gap afterward.",
    ),
    note(
      "f59",
      "A gap under the garden fence",
      "Living systems",
      "A small opening at ground level can connect neighboring gardens for roaming wildlife. A line of isolated green patches becomes a continuous route.",
    ),
    note(
      "f60",
      "Leave some fallen wood",
      "Living systems",
      "A fallen branch becomes shelter and food for fungi and insects as it decays. Leaving a safe corner untidied supports living processes that a spotless garden removes.",
    ),
  ],
  "studio-notebook": [
    note(
      "s41",
      "Preview before a lasting change",
      "Trust & agency",
      "Show the effect of a destructive edit before applying it. A clear preview helps someone notice that the wrong file or group of records is selected.",
    ),
    note(
      "s42",
      "Permission at the moment of need",
      "Trust & agency",
      "Ask for camera access when a person chooses to take a picture. Explain the immediate purpose in the same place as the request, so the permission has context.",
    ),
    note(
      "s43",
      "Show what has been saved",
      "Trust & agency",
      "A quiet saved indicator tells a writer their changes have reached storage. If saving fails, preserve the text and give them a way to copy or download it.",
    ),
    note(
      "s44",
      "Keep working without a connection",
      "Systems",
      "Store an editable draft locally while the network is unavailable. Show pending changes and synchronize them when the connection returns, without silently replacing newer work.",
    ),
    note(
      "s45",
      "A target large enough to tap",
      "Access",
      "Small touch targets are difficult when a hand is moving or a finger covers the screen. Give important controls a generous hit area and space between neighboring actions.",
    ),
    note(
      "s46",
      "Label the icon with words",
      "Access",
      "A familiar-looking symbol can still have several meanings. A visible text label helps a new visitor understand what a button will do before pressing it.",
    ),
    note(
      "s47",
      "Keep the focus visible",
      "Access",
      "A strong focus outline shows which control will respond to the keyboard. The indicator should remain visible against every background and should not depend on color alone.",
    ),
    note(
      "s48",
      "Move focus with the dialog",
      "Access",
      "When a dialog opens, put keyboard focus inside it. When it closes, return focus to the control that opened it so the user can continue from the same place.",
    ),
    note(
      "s49",
      "Explain the result of an action",
      "Trust & agency",
      "After a person changes a setting, show the resulting state in plain language. A brief confirmation is more useful than a mysterious green flash.",
    ),
    note(
      "s50",
      "Study the first attempt",
      "Research",
      "Watch somebody use a prototype before giving instructions. Their first interpretation reveals which labels and controls make sense without a guided demonstration.",
    ),
    note(
      "s51",
      "Separate an observation from a guess",
      "Research",
      "Write what the participant actually did before recording why you think they did it. Keeping evidence and interpretation separate makes research notes easier to challenge.",
    ),
    note(
      "s52",
      "Test one risky assumption",
      "Research",
      "A prototype can answer a narrow question without imitating a finished product. Build the part that makes an uncertain assumption observable, then learn from the attempt.",
    ),
    note(
      "s53",
      "Compare against a simple baseline",
      "Research",
      "A complicated algorithm needs a simpler reference result. Compare both on the same held-out cases before claiming that added complexity improves the outcome.",
    ),
    note(
      "s54",
      "Watch the slowest requests",
      "Systems",
      "An average response time can hide a painful tail. Track the requests at the slow end and inspect which operation makes those users wait.",
    ),
    note(
      "s55",
      "Cache work that has not changed",
      "Systems",
      "Reuse an expensive result when its inputs are unchanged. Include the relevant version and settings in the cache key so old output cannot masquerade as a fresh calculation.",
    ),
    note(
      "s56",
      "A retry should be safe",
      "Systems",
      "Retrying a failed operation should not create duplicate records. Give a request an identity that lets the receiver recognize an attempt it has already completed.",
    ),
    note(
      "s57",
      "Clean up when a view closes",
      "Systems",
      "Remove event listeners, stop animation loops, and release workers when a view is removed. Work that continues invisibly can make the next screen slow or unstable.",
    ),
    note(
      "s58",
      "Use space to show a group",
      "Visual craft",
      "Keep related controls near each other and leave more space between separate tasks. Consistent spacing can explain a page before someone reads every label.",
    ),
    note(
      "s59",
      "Choose one thing to emphasize",
      "Visual craft",
      "If every heading, border, and button shouts, the important action disappears. Reserve the strongest contrast for the decision a visitor needs to make next.",
    ),
    note(
      "s60",
      "Make the empty state useful",
      "Visual craft",
      "An empty list should explain what belongs there and offer a clear first action. A relevant example can help someone begin without filling the page with instructions.",
    ),
  ],
};
const examples = {
  "field-notes": [
    "How can a city stay cool without using more electricity?",
    "Borrow instead of buy",
    "Protect old photos",
    "Make room for wildlife",
  ],
  "studio-notebook": [
    "Undo a mistake",
    "An interface someone can navigate by listening.",
    "Keep data when offline",
    "Find the slow requests",
  ],
};
export const collections = original.map((c) => ({
  ...c,
  examples: examples[c.id],
  exampleLabels:
    c.id === "field-notes"
      ? [
          "Cool a city",
          "Borrow instead of buy",
          "Protect old photos",
          "Make room for wildlife",
        ]
      : [
          "Undo a mistake",
          "Navigate by listening",
          "Keep data when offline",
          "Find the slow requests",
        ],
  notes: [...c.notes, ...added[c.id]],
}));
