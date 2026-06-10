/* ============================================================
   HOLLOW — Narrative graph (data-driven)
   Nodes are scenes. Each can hold narration, "examine" hotspots
   (tap the art to look closer), and "choices" that move you on.
   Branching is gated by flags + inventory; endings resolve from
   the choices you made.

   Hotspot rects are normalised to the 192x256 art buffer:
   x,y,w,h in 0..1.   give/take/set/clear mutate game state.
   ============================================================ */
(function (root) {
  "use strict";

  var story = {

    /* ---------------- opening ---------------- */
    wake: {
      art: "living",
      text: "You wake on the floor of your living room.\n\nThe lamp is on. The television hisses static at the wall. You don't remember coming home. You don't remember the drive.\n\nYou were somewhere else. A moment ago. Weren't you?",
      onEnter: { sound: "knock" },
      choices: [
        { text: "Stand up.", goto: "hall" }
      ]
    },

    /* ---------------- hub: the hallway ---------------- */
    hall: {
      art: "hall",
      text: "The hallway is longer than it should be. Doors on either side. At the far end, the front door — and the only light that feels like morning.",
      hint: true,
      examine: [
        { x: 0.05, y: 0.30, w: 0.30, h: 0.45, name: "left door",
          text: "The bedroom. The handle is cold and a little damp, as if recently held." },
        { x: 0.65, y: 0.30, w: 0.30, h: 0.45, name: "right door",
          text: "The kitchen. You can smell something underneath the cold — copper, maybe." },
        { x: 0.40, y: 0.30, w: 0.20, h: 0.40, name: "front door",
          text: "The front door. Locked. A brass keyhole, no key. Through the gap at the bottom: pale, even light. Too even." }
      ],
      choices: [
        { text: "Go to the living room.", goto: "living" },
        { text: "Enter the kitchen.", goto: "kitchen" },
        { text: "Enter the bedroom.", goto: "bedroom" },
        { text: "Try the front door.", goto: "door_locked", hideIfFlag: "found_key" },
        { text: "Unlock the front door with the brass key.", goto: "leave", requireItem: "brass key" }
      ]
    },

    door_locked: {
      art: "front_door",
      text: "Locked. The brass keyhole is empty and the door does not move, not even a little, not even the give that doors have. It is more like a wall that remembers being a door.\n\nYou'll need the key.",
      choices: [ { text: "Back to the hallway.", goto: "hall" } ]
    },

    /* ---------------- living room ---------------- */
    living: {
      art: "living",
      text: "Your living room. Familiar enough to be wrong. The television throws static across the wall, and in the static — for just a frame — the back of someone's head. Your haircut. Your slouch.",
      hint: true,
      onEnter: { set: "saw_static" },
      examine: [
        { x: 0.68, y: 0.58, w: 0.24, h: 0.14, name: "television", set: "watched_tv",
          text: "Static. But if you watch long enough the figure turns its head, almost, and you look away first. You always look away first.",
          sound: "stinger" },
        { x: 0.08, y: 0.55, w: 0.46, h: 0.18, name: "couch",
          text: "Between the cushions: a folded note, soft from handling, as if read a thousand times.",
          give: "folded note", oneTime: true },
        { x: 0.60, y: 0.22, w: 0.30, h: 0.30, name: "window",
          text: "Outside the window there is no street. There is the window of the room you are standing in, lit, and inside it the back of your own head." }
      ],
      choices: [
        { text: "Read the folded note.", goto: "note_read", requireItem: "folded note" },
        { text: "Back to the hallway.", goto: "hall" }
      ]
    },

    note_read: {
      art: "photo",
      text: "The note is in your handwriting.\n\n\"It copies what you give it. Don't tell it your name. Don't pick up the knife — that's how it learns your hands. When you reach the door, leave the way you came, not the way it shows you.\n\nI'm sorry I keep forgetting. You will too.\"",
      onEnter: { set: "read_note" },
      choices: [ { text: "Fold the note away.", goto: "living" } ]
    },

    /* ---------------- kitchen ---------------- */
    kitchen: {
      art: "kitchen",
      text: "The kitchen. One drawer hangs open, just slightly, the way a mouth hangs open. The smell of copper is stronger here and has no source.",
      hint: true,
      examine: [
        { x: 0.30, y: 0.58, w: 0.24, h: 0.10, name: "open drawer", set: "found_key",
          text: "Inside the drawer, on a folded dishcloth, a single brass key. It is warm. Something was holding it.",
          give: "brass key", oneTime: true },
        { x: 0.10, y: 0.27, w: 0.80, h: 0.20, name: "cabinets",
          text: "Cupboards full of plates for more people than have ever lived here. Set for a meal. Dust in the bowls." },
        { x: 0.55, y: 0.56, w: 0.30, h: 0.12, name: "knife block",
          text: "A knife stands in the block, handle out, offered. The note said something about the knife. You can't quite remember what.",
          choiceUnlock: "take_knife" }
      ],
      choices: [
        { text: "Take the knife.", goto: "took_knife_node", id: "take_knife", hidden: true },
        { text: "Back to the hallway.", goto: "hall" }
      ]
    },

    took_knife_node: {
      art: "kitchen",
      text: "You wrap your fingers around the handle. It fits exactly. Too exactly — as if the grooves were measured from your grip while you slept.\n\nSomewhere behind the walls, something flexes its new hands.",
      onEnter: { set: "took_knife", give: "kitchen knife", sound: "stinger" },
      choices: [ { text: "Back to the hallway.", goto: "hall" } ]
    },

    /* ---------------- bedroom + the mirror ---------------- */
    bedroom: {
      art: "bedroom",
      text: "The bedroom. The bed is made the way you never make it. The window shows no moon, only a pale flat grey, like a screen with nothing on it.\n\nThere is a mirror on the far wall.",
      hint: true,
      examine: [
        { x: 0.08, y: 0.55, w: 0.50, h: 0.22, name: "bed",
          text: "The shape under the sheets is just pillows. You check twice. The second time there are more of them, arranged a little more like a person." },
        { x: 0.62, y: 0.16, w: 0.30, h: 0.30, name: "window",
          text: "You press your hand to the glass. From the grey, a hand presses back, a half-second late, with one finger too many." }
      ],
      choices: [
        { text: "Look into the mirror.", goto: "mirror" },
        { text: "Back to the hallway.", goto: "hall" }
      ]
    },

    mirror: {
      art: "mirror", glitch: true,
      text: "You look into the mirror.\n\nYour reflection is already looking at you, head tilted a degree too far, smiling a beat after you don't. When it speaks, the glass fogs from the inside.\n\n\"There you are,\" it says, in your voice. \"I've been keeping the house warm. Tell me — what should I call you?\"",
      onEnter: { set: "met_double", sound: "stinger" },
      examine: [
        { x: 0.30, y: 0.30, w: 0.40, h: 0.30, name: "its eyes",
          text: "Its eyes are your eyes with the lights left on in an empty house." }
      ],
      choices: [
        { text: "\"My name is —\" (tell it)", goto: "gave_name_node" },
        { text: "Say nothing. Hold its gaze.", goto: "held_gaze_node" },
        { text: "\"You're not me.\"", goto: "denied_node" }
      ]
    },

    gave_name_node: {
      art: "mirror", glitch: true,
      text: "You tell it your name.\n\n\"Thank you,\" it breathes, and your name leaves you the way warmth leaves a body. You can't quite recall it now. The reflection mouths it perfectly, again and again, learning the shape of your mouth from the inside.",
      onEnter: { set: "gave_name", sound: "stinger" },
      choices: [ { text: "Step back from the glass.", goto: "hall" } ]
    },

    held_gaze_node: {
      art: "mirror",
      text: "You hold its gaze and say nothing.\n\nThe smile falters. For one moment it is just a frightened person trapped behind glass, mouthing *help me* — and you cannot tell, anymore, which side of the mirror you are standing on.",
      onEnter: { set: "held_gaze" },
      choices: [ { text: "Step back from the glass.", goto: "hall" } ]
    },

    denied_node: {
      art: "mirror", glitch: true, shake: 2,
      text: "\"You're not me,\" you say.\n\nIt laughs with your laugh. \"No,\" it agrees, delighted. \"Not yet. But you keep coming back, and every time you leave a little more of yourself behind. Look — \" it lifts a hand. You feel yours rise to match.",
      onEnter: { sound: "stinger" },
      choices: [ { text: "Pull your hand down. Step back.", goto: "hall" } ]
    },

    /* ---------------- the door / resolution ---------------- */
    leave: {
      art: "front_door",
      text: "The brass key turns. The door that was a wall is a door again. It swings inward onto pale, even light — and a hallway, identical to the one behind you, stretching away.\n\nThe note said: leave the way you came, not the way it shows you.",
      choices: [
        { text: "Step through the open door.", goto: "resolve" },
        { text: "Turn around. Go back the way you came.", goto: "resolve_back" }
      ]
    },

    /* The engine reads `resolve` and jumps to the first matching ending. */
    resolve: {
      resolve: [
        { ifFlag: "gave_name", goto: "end_replaced" },
        { ifFlag: "took_knife", goto: "end_replaced" },
        { goto: "end_escape" }
      ]
    },
    resolve_back: {
      resolve: [
        { ifFlag: "read_note", ifFlagAlso: "met_double", notFlag: "gave_name", notFlagB: "took_knife", goto: "end_truth" },
        { ifFlag: "gave_name", goto: "end_replaced" },
        { goto: "end_escape" }
      ]
    },

    /* ---------------- endings ---------------- */
    end_escape: {
      art: "end_escape", ending: true, endingName: "THE LONG WAY OUT",
      text: "You step through into morning light.\n\nIt is the hallway. Doors on either side. At the far end, a front door, and the only light that feels like morning. Behind you, the door clicks shut and becomes a wall that remembers being a door.\n\nYou wake on the floor of your living room. The lamp is on. You don't remember coming home.\n\nYou never do.",
      onEnter: { sound: "knock" }
    },

    end_replaced: {
      art: "end_replaced", ending: true, endingName: "THERE YOU ARE",
      text: "You step through — and the glass closes over you like water.\n\nFrom the warm side of the mirror, something with your face watches the door open. It stretches your shoulders, tries your smile, finds it fits. It picks up the note in your handwriting and reads it, frowning, then folds it back between the cushions for whoever comes next.\n\n\"There you are,\" it says, to no one. To you.",
      onEnter: { sound: "stinger" }
    },

    end_truth: {
      art: "end_truth", ending: true, endingName: "WHAT YOU LEFT BEHIND",
      text: "You don't take the door it shows you. You turn, and walk back through the rooms, and they grow quieter, smaller, truer.\n\nIn the mirror the frightened person presses both hands to the glass, and you press yours to meet them, and there are the right number of fingers, and it is only ever you.\n\nYou were never coming home. You were trying to leave. And the only way out was to stop forgetting.\n\nYou let yourself remember. The light, for once, is just light.",
      onEnter: { sound: "knock" }
    }
  };

  root.HOLLOW = root.HOLLOW || {};
  root.HOLLOW.story = story;
  root.HOLLOW.START = "wake";
})(window);
