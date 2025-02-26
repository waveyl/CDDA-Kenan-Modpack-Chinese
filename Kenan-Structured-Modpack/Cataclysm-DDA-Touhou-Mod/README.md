# Cataclysm-DDA-Touhou-Mod
This is a fork of Taberone's [Touhou Professions](https://github.com/Taberone/Cataclysm-DDA-Touhou-Mod) mod.

**The mod's folder goes in /data/mods/**.  Last updated for game version: 2024-01-26-0650 experimental.

Also check the [Expansion](https://github.com/RedMisao/Cataclysm-DDA-Touhou-Expansion) mod!


## About the mod
This mod adds Touhou Project characters as professions.  Characters (2hus) have custom spells, abilities, clothing, martial arts, traits (mutations), and more.  To pick any of the 2hus, you have to select the **Touhou Mod** scenario when creating a new character.


## 2hus
* **Aya Shameimaru:** Uses wind spells.  The earnest, most pure, fastest Tengu reporter is always on the look of interesting news.
* **Fujiwara no Mokou:** Uses fire spells.  Fights using a custom brawling style.  Her attacks do increased damage with more pain.  Death has no meaning to her.
* **Hong Meiling:** Uses qi.  Fights using a special form of Tai Chi focused on defense, with windows of opportunity after blocking attacks.  Nap time can't come soon enough.
* **Hata no Kokoro:** Uses emotion.  Constantly swaps between four masks representing emotions, each grants her different effects (affects spells too!).
* **Iku Nagae:** Uses electric spells.  Fights by whipping and shocking enemies to death, while dancing on the battlefield.
* **Reisen:** Uses a mysterious ability.  Recently conscripted into the Lunarian Defence Corps, fights aided by her service Lunarian rifle and basic military training.  She's trying her best!
* **Reisen Udongein Inaba:** Uses wavelength manipulation.  Former member of the Elite Lunarian Defence Corps, proficient with firearms and skilled in special operations.  Starts with a Lunarian tech pistol.
* **Remilia Scarlet:** Uses Red Magic.  The charismatic vampire leader of the Scarlet Devil Mansion, nothing can oppose her when she's serious.
* **Rin Kaenbyou :** Uses destructive fire spells and calls forth Vengeful spirits to assist her in battle.  Collects corpses with her wooden wheelbarrow.
* **Sakuya Izayoi:** Uses time manipulation.  Fights by elegantly throwing knives, then cleaning it all perfectly afterwards.
* **Seiga Kaku:** Uses wicked spells and can pass through walls.  Fights without care for human life or norms, all while forcing "collateral damage" victims back to life to fight for her.
* **Tenshi Hinanawi:** Uses earth spells.  Very resistant to physical damage, very susceptible to boredom, she wields the Sword of Hisou and fights with a martial art focused on critical attacks over anything else.
* **Utsuho Reiuji:** Uses nuclear spells.  She's half Hell Raven, half sun god, half pet, wholly awesome.
* **Yamame Kurodani:** Uses arachnid techniques.  Inflicts illnesses upon her enemies, which she can manipulate further.  Good thing she's a friendly spider!
* **Youmu Konpaku:** Uses sword techniques.  Also trained in gardening, she wields Roukanken and Hakurouken, two Youkai katana capable of cutting anything!


## New mechanics
* Auras.  Various characters have toggle-able "aura" style abilities, each granting different effects as long as they're active.  Can be turned ON or OFF by casting specific spells.
* Blood thirst.  Remi now has to consume blood (or human flesh, with less effectiveness) in any shape or form, in order to keep the thirst at bay.
* Immortality.  Mokou resurrects after dying, immediately restoring her body.  She can die as many times as she wants, but there's a soft cap relative to how many times she has died in a period of time, plus a small-ish pain debuff that stacks, to discourage savescumming.
* Martial arts (custom effects).  Some characters have martial arts with different effects, such as automatic spell casting at the target (with no cost), cosmetic effects, conditional effects depending on the equipped weapon, etc.
* Spell growth.  All character spells and spell effects now scale proportionally to their main skills, instead of spell level.
* Spell tags.  Some spells can now "tag" monsters, which enables FUN stuff like spreading diseases between monsters, monster copying spellcasts by the player, spell interactions, conditional spell effects, and more.
* Weapon scaling.  Some spells now also scale from the equipped weapon's damage.
* Wings.  Aya, Remi and Utsuho can now "fly" (read: hover) over over ledges and open spaces, consuming stamina until they're tired enough.  This is done by activating a mutation (View/active mutations key).
* Youkai form toggle.  Kaenbyou and Remi can now switch between their human and youkai forms, each having different effects.  This is done by activating a mutation (View/active mutations key).


## Clothing
Every 2hu has their own custom set of clothing.  Not all are just cosmetics changes.


## Minor milestones
Relatively easy things to add, not in order:
* More 2hus: Nitori and Kasen (WIP).  I want to add Flandre and Joon too.
* Visual effects: Can it be done with fields? For example, when Youmu dashes, cherry petals appear on the path.
* Vehicles: Make an engine that can use corpses as fuel.  Partially done by killing enemies which drop a resource that can be crafted into fuel.  Almost as metal as using blood as fuel.
* Balance: CDDA is a roguelike, but the mod feels RPG-ish at times.


## Major milestones
Relatively hard or complex things to add, not in order:
* Even MORE 2hus.
* Things that are currently hardcoded, like new resources (plus a visual indicator), new kind of spells (like using proyectiles, different shape, etc.), more mechanics, etc.
* Spellcards?


## Known bugs
* Kokoro's morale-to-mana passive doesn't remove "physical" morale statuses like being wet, it grants her mana as long as she's upset about it
* Mokou's resurrection moves her 3 tiles to the right, every time she revives.  I have no idea how or why this happens; this is potentially very very bad for the player.
* (minor) The auras cycle weird, they don't stop when they should.  This has no effect for the player but it's something to take in consideration when using the backbone, as they require lots of debugging to guarantee nothing will break.  For more information see the //IMPORTANT comments at utsuho_fusionblade_cycle2 .
* Yamame's Miasma Burst is not storing damage when used on monsters.  I believe the queue_eocs EOCs broke for them at some point earlier this year (although I cannot prove it), which was a core component by allowing an hidden dmg counter on the affected targets to run as long as they were affected by her diseases

