import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

interface LegalSection {
  title: string;
  defaultOpen?: boolean;
  body: string;
}

const CC_BY_SECTION = `This app's rules content includes material governed by the Creative Commons Attribution 4.0 International License (CC-BY-4.0): https://creativecommons.org/licenses/by/4.0/legalcode

Required attribution, reproduced verbatim as specified by the licensor:

"This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."

"This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode."

Also under CC-BY-4.0: the Black Flag SRD (Copyright Open Design LLC d/b/a Kobold Press, https://koboldpress.com/black-flag-reference-document/) and Spells That Don't Suck (Copyright Somanyrobots). No content in this app has been modified from its source beyond formatting for display.

The Elderberry Inn icon set is dedicated to the public domain under CC0 — no attribution required, credited here anyway: Copyright Open5e.`;

const OGL_LICENSE_TEXT = `The following text is the property of Wizards of the Coast, Inc. and is Copyright 2000 Wizards of the Coast, Inc ("Wizards"). All Rights Reserved.

1. Definitions: "Contributors" means the copyright and/or trademark owners who have contributed Open Game Content; "Derivative Material" means copyrighted material including derivative works and translations (including into other computer languages), potation, modification, correction, addition, extension, upgrade, improvement, compilation, abridgment or other form in which an existing work may be recast, transformed or adapted; "Distribute" means to reproduce, license, rent, lease, sell, broadcast, publicly display, transmit or otherwise distribute; "Open Game Content" means the game mechanic and includes the methods, procedures, processes and routines to the extent such content does not embody the Product Identity and is an enhancement over the prior art and any additional content clearly identified as Open Game Content by the Contributor, and means any work covered by this License, including translations and derivative works under copyright law, but specifically excludes Product Identity. "Product Identity" means product and product line names, logos and identifying marks including trade dress; artifacts; creatures characters; stories, storylines, plots, thematic elements, dialogue, incidents, language, artwork, symbols, designs, depictions, likenesses, formats, poses, concepts, themes and graphic, photographic and other visual or audio representations; names and descriptions of characters, spells, enchantments, personalities, teams, personas, likenesses and special abilities; places, locations, environments, creatures, equipment, magical or supernatural abilities or effects, logos, symbols, or graphic designs; and any other trademark or registered trademark clearly identified as Product identity by the owner of the Product Identity, and which specifically excludes the Open Game Content; "Trademark" means the logos, names, mark, sign, motto, designs that are used by a Contributor to identify itself or its products or the associated products contributed to the Open Game License by the Contributor; "Use", "Used" or "Using" means to use, Distribute, copy, edit, format, modify, translate and otherwise create Derivative Material of Open Game Content. "You" or "Your" means the licensee in terms of this agreement.

2. The License: This License applies to any Open Game Content that contains a notice indicating that the Open Game Content may only be Used under and in terms of this License. You must affix such a notice to any Open Game Content that you Use. No terms may be added to or subtracted from this License except as described by the License itself. No other terms or conditions may be applied to any Open Game Content distributed using this License.

3. Offer and Acceptance: By Using the Open Game Content You indicate Your acceptance of the terms of this License.

4. Grant and Consideration: In consideration for agreeing to use this License, the Contributors grant You a perpetual, worldwide, royalty-free, non-exclusive license with the exact terms of this License to Use, the Open Game Content.

5. Representation of Authority to Contribute: If You are contributing original material as Open Game Content, You represent that Your Contributions are Your original creation and/or You have sufficient rights to grant the rights conveyed by this License.

6. Notice of License Copyright: You must update the COPYRIGHT NOTICE portion of this License to include the exact text of the COPYRIGHT NOTICE of any Open Game Content You are copying, modifying or distributing, and You must add the title, the copyright date, and the copyright holder's name to the COPYRIGHT NOTICE of any original Open Game Content you Distribute.

7. Use of Product Identity: You agree not to Use any Product Identity, including as an indication as to compatibility, except as expressly licensed in another, independent Agreement with the owner of each element of that Product Identity. You agree not to indicate compatibility or co-adaptability with any Trademark or Registered Trademark in conjunction with a work containing Open Game Content except as expressly licensed in another, independent Agreement with the owner of such Trademark or Registered Trademark. The use of any Product Identity in Open Game Content does not constitute a challenge to the ownership of that Product Identity. The owner of any Product Identity used in Open Game Content shall retain all rights, title and interest in and to that Product Identity.

8. Identification: If you distribute Open Game Content You must clearly indicate which portions of the work that you are distributing are Open Game Content.

9. Updating the License: Wizards or its designated Agents may publish updated versions of this License. You may use any authorized version of this License to copy, modify and distribute any Open Game Content originally distributed under any version of this License.

10. Copy of this License: You MUST include a copy of this License with every copy of the Open Game Content You Distribute.

11. Use of Contributor Credits: You may not market or advertise the Open Game Content using the name of any Contributor unless You have written permission from the Contributor to do so.

12. Inability to Comply: If it is impossible for You to comply with any of the terms of this License with respect to some or all of the Open Game Content due to statute, judicial order, or governmental regulation then You may not Use any Open Game Material so affected.

13. Termination: This License will terminate automatically if You fail to comply with all terms herein and fail to cure such breach within 30 days of becoming aware of the breach. All sublicenses shall survive the termination of this License.

14. Reformation: If any provision of this License is held to be unenforceable, such provision shall be reformed only to the extent necessary to make it enforceable.`;

const SECTION_15_NOTICE = `Open Game License v1.0a Copyright 2000, Wizards of the Coast, Inc.

System Reference Document 5.1 Copyright 2016, Wizards of the Coast, Inc.; Authors Mike Mearls, Jeremy Crawford, Chris Perkins, Rodney Thompson, Peter Lee, James Wyatt, Robert J. Schwalb, Bruce R. Cordell, Chris Sims, and Steve Townshend, based on original material by E. Gary Gygax and Dave Arneson.

Creature Codex, Copyright 2018, Kobold Press; Authors Wolfgang Baur, Dan Dillon, Richard Green, James Haeck, Chris Harris, Jeremy Hochhalter, James Introcaso, Chris Lockey, Shawn Merwin, and Jon Sawatsky.

Deep Magic for 5th Edition, Copyright 2020, Kobold Press; Authors Dan Dillon, Chris Harris, and Jeff Lee.

Deep Magic Extended, Copyright 2024, Kobold Press.

Kobold Press Compilation, Copyright 2024, Kobold Press.

Open5e Originals, Copyright 2024, Open5e; Authors Ean Moody and others.

Tal'dorei Campaign Setting, Copyright 2017, Green Ronin Publishing; Authors Matthew Mercer, James Haeck.

Tome of Beasts, Copyright 2016, Kobold Press; Authors Chris Harris, Dan Dillon, Rodrigo Garcia Carmona, and Wolfgang Baur.

Tome of Beasts 1 (2023 Edition), Copyright 2024, Kobold Press; Authors Dan Dillon, Chris Harris, Rodrigo Garcia Carmona, Wolfgang Baur.

Tome of Beasts 2, Copyright 2020, Kobold Press; Authors Wolfgang Baur, Celeste Conowitch, Darrin Drader, James Introcaso, Philip Larwood, Jeff Lee, Kelly Pawlik, Brian Suskind, Mike Welham.

Tome of Beasts 3, Copyright 2022, Kobold Press; Authors Wolfgang Baur, Celeste Conowitch, Darrin Drader, James Introcaso, Philip Larwood, Jeff Lee, Kelly Pawlik, Brian Suskind, Mike Welham.

Tome of Heroes, Copyright 2022, Kobold Press; Authors Kelly Pawlik, Ben McFarland, and Brian Suskind.

Vault of Magic, Copyright 2021, Kobold Press; Authors Phillip Larwood, Jeff Lee, and Christopher Lockey.

Warlock Zine, Copyright 2017, Kobold Press; Authors Wolfgang Baur and others.`;

const SECTIONS: LegalSection[] = [
  { title: "Creative Commons Attribution (CC-BY-4.0)", defaultOpen: true, body: CC_BY_SECTION },
  { title: "Open Game License, Version 1.0a", body: OGL_LICENSE_TEXT },
  { title: "Section 15 — Copyright Notice", body: SECTION_15_NOTICE },
];

function LegalCard({ section }: { section: LegalSection }) {
  const [open, setOpen] = useState(Boolean(section.defaultOpen));

  return (
    <View className="overflow-hidden rounded-md border border-panel-border bg-panel">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-3 p-4 active:bg-white/5"
      >
        <Text className="flex-1 font-semibold text-foreground">{section.title}</Text>
        <Text className="text-muted">{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open && (
        <View className="border-t border-panel-border/60 p-4">
          <Text className="text-sm leading-relaxed text-foreground/90">{section.body}</Text>
        </View>
      )}
    </View>
  );
}

export default function LegalScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4 pb-8">
      <Text className="text-sm leading-relaxed text-muted">
        Infernal Codex's Rules and Monsters content is sourced from the D&amp;D 5e System Reference
        Documents and third-party sourcebooks via the{" "}
        <Text className="text-accent underline" onPress={() => Linking.openURL("https://open5e.com/")}>
          Open5e
        </Text>{" "}
        project, used under the licenses below.
      </Text>

      {SECTIONS.map((section) => (
        <LegalCard key={section.title} section={section} />
      ))}

      <Text className="mt-2 text-center text-xs text-muted">
        Infernal Codex is an independent project and is not affiliated with, endorsed by, or sponsored
        by Wizards of the Coast.
      </Text>
    </ScrollView>
  );
}
