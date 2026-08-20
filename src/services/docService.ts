// docService.ts
// Converts a Genesys Cloud Architect flow export (JSON) into a readable
// Markdown documentation (elements + TTS for the whole call flow).

type AnyObj = Record<string, any>;

export class DocService {
  /** Never leave a documentation field visually blank. */
  private value(value: unknown, fallback = "Not supplied"): string {
    if (value === undefined || value === null) return fallback;
    const text = String(value).trim();
    return text ? text : fallback;
  }

  /**
   * Entry point — pass the parsed flow JSON (the file you get from
   * /flows/{flowId}/latestconfiguration) and get back a Markdown string.
   */
  public generateReadme(flow: AnyObj, route?: AnyObj): string {
    const seq: AnyObj[] = flow.flowSequenceItemList ?? [];
    const tasks = seq.filter((x) => x.__type === "Task");
    const menus = seq.filter((x) => x.__type === "Menu");

    const lines: string[] = [];

    lines.push(`# ${this.value(route?.name ?? flow.name, "Untitled Flow")}\n`);

    // ---------- Route ----------
    lines.push("## Route\n");
    lines.push(`**IVR Name:** ${this.value(route?.name)}  `);
    lines.push(`**IVR ID:** \`${this.value(route?.id)}\`  `);
    lines.push(`**DNIS:** ${this.value(route?.dnis?.join(", "))}  `);
    lines.push(`**State:** ${this.value(route?.state)}  `);
    lines.push("\n### Configured Flow\n");
    lines.push(`**Name:** ${this.value(flow.name, "Untitled Flow")}  `);
    lines.push(`**ID:** \`${this.value(route?.openHoursFlow?.id ?? flow.id)}\`  `);
    lines.push("**Assignment:** Open-hours flow\n");
    lines.push("---\n");

    // ---------- Business focus ----------
    lines.push("## Business Focus\n");
    lines.push("### Purpose\n");
    lines.push(`${this.value(flow.description, "No flow description is configured.")}\n`);
    lines.push("### Customer Journey\n");
    lines.push(...this.businessJourney(flow, tasks, menus));
    lines.push("\n---\n");

    // ---------- Technical focus ----------
    lines.push("## Technical Focus\n");
    lines.push("### Flow Configuration\n");
    lines.push(`**Default language:** ${this.value(flow.defaultLanguage)}  `);
    const ttsVoice =
      flow.supportedLanguageOptions?.[0]?.textToSpeech?.voice?.name;
    lines.push(`**TTS Voice:** ${this.value(ttsVoice)}\n`);

    // ---------- Variables ----------
    lines.push("## Flow-scoped Variables\n");
    lines.push("| Variable | Type | Default | Description |");
    lines.push("|---|---|---|---|");
    for (const v of flow.variables ?? []) {
      const vtype = (v.__type ?? "").replace("Variable", "");
      const def = this.value(v.initialValue?.text);
      lines.push(
        `| \`${this.value(v.name, "Unnamed variable")}\` | ${this.value(vtype, "Unspecified")} | \`${def}\` | ${this.value(v.description)} |`,
      );
    }
    lines.push("");

    // ---------- Integrations ----------
    lines.push("## Integrations and Routing Dependencies\n");
    lines.push("| Type | Target | Used By |");
    lines.push("|---|---|---|");
    for (const integration of this.integrations(flow)) {
      lines.push(
        `| ${integration.type} | ${integration.target} | ${integration.usedBy || "Not specified"} |`,
      );
    }
    lines.push("");

    // ---------- Overview table ----------
    lines.push("## Tasks & Menus Overview\n");
    lines.push("| Container | Type | # Elements |");
    lines.push("|---|---|---|");
    for (const t of tasks) {
      lines.push(`| ${t.name} | Task | ${(t.actionList ?? []).length} |`);
    }
    for (const m of menus) {
      lines.push(
        `| ${m.name} | Menu | ${(m.menuChoiceList ?? []).length} choices |`,
      );
    }
    lines.push("");

    // ---------- Per-Task ordered walk ----------
    for (const t of tasks) {
      lines.push(`\n---\n\n## Task: ${t.name}\n`);
      lines.push(...this.walkTask(t, menus));
    }

    // ---------- Menus ----------
    for (const m of menus) {
      lines.push(`\n---\n\n## Menu: ${m.name}\n`);
      lines.push(...this.describeMenu(m, menus));
    }

    return lines.join("\n");
  }

  private businessDestination(action: AnyObj, menus: AnyObj[]): string {
    switch (action.__type) {
      case "TransferTaskAction":
        return action.taskName ?? "Task";
      case "TransferMenuAction":
        return action.menuName ?? "Menu";
      case "MenuAction":
        return menus.find((m) => m.id === action.menuReference)?.name ?? "Menu";
      case "TransferPureMatchAction":
        return (action.queues ?? []).map((q: AnyObj) => q.text).join(", ") || "Agent queue";
      case "DisconnectAction":
        return "Call ends";
      default:
        return action.name ?? action.__type ?? "Not specified";
    }
  }

  /**
   * Produces a call-tree that business users can follow from the entry menus
   * through decisions, self service, integrations, transfers and disconnects.
   */
  private businessJourney(flow: AnyObj, tasks: AnyObj[], menus: AnyObj[]): string[] {
    const lines: string[] = [];
    const allMenus = new Map(menus.map((menu) => [menu.id, menu]));
    const allTasks = new Map(tasks.map((task) => [task.name, task]));
    const referencedMenus = new Set<string>();
    const referencedTasks = new Set<string>();

    const containerActions = (container: AnyObj): AnyObj[] => [
      ...(container.actionList ?? []),
      ...(container.menuChoiceList ?? []).map((choice: AnyObj) => choice.action ?? {}),
    ];
    for (const container of [...menus, ...tasks]) {
      for (const action of this.actionsDeep(containerActions(container))) {
        if (action.__type === "MenuAction" && action.menuReference) referencedMenus.add(action.menuReference);
        if (action.__type === "TransferMenuAction" && action.menuName) {
          const target = menus.find((item) => item.name === action.menuName);
          if (target?.id) referencedMenus.add(target.id);
        }
        if (action.__type === "TransferTaskAction" && action.taskName) referencedTasks.add(action.taskName);
      }
    }

    const configuredStart = this.findConfiguredStart(flow, tasks, menus);
    const entryMenus = menus.filter((menu) => !referencedMenus.has(menu.id));
    const entryTasks = tasks.filter((task) => !referencedTasks.has(task.name));
    const roots = configuredStart ? [configuredStart] : entryMenus.length || entryTasks.length
      ? [...entryMenus, ...entryTasks]
      : [...menus, ...tasks];

    if (!roots.length) return ["- No menus or tasks are configured for this flow.\n"];

    const renderedMenus = new Set<string>();
    const renderedTasks = new Set<string>();
    const initialGreeting = this.extractTts(flow.initialPrompts ?? {})[0];
    if (initialGreeting) lines.push(`**Initial greeting:** ${initialGreeting}\n`);
    for (const root of roots) {
      if (root.__type === "Menu") {
        this.renderBusinessMenu(root, 0, lines, allMenus, allTasks, renderedMenus, renderedTasks);
      } else {
        lines.push(`1. **${this.value(root.name, "Unnamed task")}**`);
        this.renderBusinessTask(root, 1, lines, allMenus, allTasks, renderedMenus, renderedTasks);
      }
    }
    return lines;
  }

  /** Returns all action-shaped objects, including nested decision/switch outcomes. */
  private actionsDeep(nodes: AnyObj[]): AnyObj[] {
    const found: AnyObj[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach(visit); return; }
      const item = value as AnyObj;
      if (typeof item.__type === "string" && item.__type.endsWith("Action")) found.push(item);
      Object.values(item).forEach(visit);
    };
    nodes.forEach(visit);
    return found;
  }

  /** Prefer Architect's explicit entry reference over guessing from unreferenced containers. */
  private findConfiguredStart(flow: AnyObj, tasks: AnyObj[], menus: AnyObj[]): AnyObj | undefined {
    const ref = flow.initialSequence ?? flow.startAction ?? flow.startSequence;
    if (typeof ref !== "string") return undefined;
    return [...tasks, ...menus].find((item) =>
      item.id === ref || item.name === ref || ref.includes(`[${item.name}_`) || ref.includes(`[${item.name}]`),
    );
  }

  private renderBusinessMenu(
    menu: AnyObj, depth: number, lines: string[], allMenus: Map<string, AnyObj>, allTasks: Map<string, AnyObj>,
    renderedMenus: Set<string>, renderedTasks: Set<string>,
  ): void {
    const label = this.value(menu.name, "Unnamed menu");
    const indent = "   ".repeat(depth);
    if (menu.id && renderedMenus.has(menu.id)) {
      lines.push(`${indent}1. **${label}** *(already shown above)*`);
      return;
    }
    if (menu.id) renderedMenus.add(menu.id);
    lines.push(`${indent}1. **${label}**`);
    const greeting = this.extractTts(menu.prompts ?? {})[0];
    if (greeting) lines.push(`${indent}   - Prompt: ${greeting}`);
    const choices = menu.menuChoiceList ?? [];
    if (!choices.length) lines.push(`${indent}   1. No options are configured.`);
    for (const choice of choices) {
      const option = this.value(choice.digit, "No digit");
      const choiceName = this.value(choice.name, "Unnamed option");
      lines.push(`${indent}   1. **${option} — ${choiceName}**`);
      this.renderBusinessAction(choice.action ?? {}, depth + 2, lines, allMenus, allTasks, renderedMenus, renderedTasks);
    }
  }

  private renderBusinessTask(
    task: AnyObj, depth: number, lines: string[], allMenus: Map<string, AnyObj>, allTasks: Map<string, AnyObj>,
    renderedMenus: Set<string>, renderedTasks: Set<string>,
  ): void {
    const taskKey = String(task.id ?? task.name);
    if (renderedTasks.has(taskKey)) {
      lines.push(`${"   ".repeat(depth)}1. This task is already shown above.`);
      return;
    }
    renderedTasks.add(taskKey);
    const actions = new Map<string, AnyObj>((task.actionList ?? []).map((action: AnyObj) => [action.id, action]));
    const seen = new Set<string>();
    const walk = (id: string | undefined, level: number) => {
      if (!id) return;
      if (seen.has(id)) {
        lines.push(`${"   ".repeat(level)}1. Rejoins a step already shown above.`);
        return;
      }
      seen.add(id);
      const action = actions.get(id);
      if (!action) { lines.push(`${"   ".repeat(level)}1. Unresolved step: ${this.value(id)}`); return; }
      this.renderBusinessAction(action, level, lines, allMenus, allTasks, renderedMenus, renderedTasks);
      const nexts = this.businessNexts(action, actions);
      for (const next of nexts) {
        if (next.label) lines.push(`${"   ".repeat(level + 1)}1. **${next.label}**`);
        walk(next.id, next.label ? level + 2 : level);
      }
    };
    walk(task.startAction, depth);
  }

  /** Finds normal, success/failure and custom action transitions in an export. */
  private businessNexts(action: AnyObj, actions: Map<string, AnyObj>): { id: string; label?: string }[] {
    const result: { id: string; label?: string }[] = [];
    const add = (id: unknown, label?: unknown) => {
      if (typeof id !== "string" || !actions.has(id) || result.some((item) => item.id === id)) return;
      result.push({ id, label: typeof label === "string" && label.trim() ? label.trim() : undefined });
    };
    for (const path of action.paths ?? []) add(path.nextActionId, path.label);
    if (result.length) return result;
    add(action.nextAction);

    // Genesys exports vary by action type. Cover transitions such as
    // successAction, failureAction, errorAction and custom *ActionId fields.
    for (const [key, value] of Object.entries(action)) {
      if (!/(?:action|actionid)$/i.test(key) || /^(?:name|actionname)$/i.test(key)) continue;
      const label = key.replace(/Action(?:Id)?$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
      add(value, label || undefined);
    }
    return result;
  }

  private businessStepTitle(action: AnyObj): string {
    const tts = this.extractTts(action)[0];
    if (tts) return tts;
    switch (action.__type) {
      case "DataAction":
        return this.value(action.actionName, "Retrieve or validate customer information")
          .replace(/\s+-\s+Exported\b.*$/i, "");
      case "DecisionAction":
        return this.value(action.name, "Evaluate customer condition");
      case "TransferPureMatchAction":
        return "Speak to an agent";
      case "DisconnectAction":
        return "End the call";
      case "CallBotFlowAction":
        return `Continue with ${this.value(action.flowName, "the bot flow")}`;
      case "TransferTaskAction":
        return `Continue to ${this.value(action.taskName, "the next task")}`;
      case "TransferMenuAction":
      case "MenuAction":
        return `Continue to ${this.value(action.menuName, "the next menu")}`;
      default:
        return this.value(action.name, action.__type ?? "Unspecified step");
    }
  }

  private renderBusinessAction(
    action: AnyObj, depth: number, lines: string[], allMenus: Map<string, AnyObj>, allTasks: Map<string, AnyObj>,
    renderedMenus: Set<string>, renderedTasks: Set<string>,
  ): void {
    const indent = "   ".repeat(depth);
    const label = this.businessStepTitle(action);
    lines.push(`${indent}1. ${label}`);
    if (action.__type === "DecisionAction") {
      lines.push(`${indent}   - Decision: ${this.value(this.decisionExpr(action), "Condition not supplied")}`);
    } else if (action.__type === "DataAction") {
      lines.push(`${indent}   - Middleware / data action: ${this.value(action.actionName)}`);
    } else if (action.__type === "TransferPureMatchAction") {
      lines.push(`${indent}   - Speak to agent: ${this.value((action.queues ?? []).map((q: AnyObj) => q.text ?? q.name).filter(Boolean).join(", "), "Agent queue not supplied")}`);
    } else if (action.__type === "DisconnectAction") {
      lines.push(`${indent}   - Call ends`);
    }

    const menu = action.__type === "MenuAction" ? allMenus.get(action.menuReference) :
      action.__type === "TransferMenuAction" ? [...allMenus.values()].find((item) => item.name === action.menuName) : undefined;
    if (menu) this.renderBusinessMenu(menu, depth + 1, lines, allMenus, allTasks, renderedMenus, renderedTasks);
    const task = action.__type === "TransferTaskAction" ? allTasks.get(action.taskName) : undefined;
    if (task) {
      lines.push(`${indent}   1. **${this.value(task.name, "Unnamed task")}**`);
      this.renderBusinessTask(task, depth + 2, lines, allMenus, allTasks, renderedMenus, renderedTasks);
    }
  }

  private integrations(flow: AnyObj): {
    type: string;
    target: string;
    usedBy: string;
  }[] {
    const integrations = new Map<string, { type: string; target: string; usedBy: string }>();
    const add = (type: string, target: string, usedBy: string) => {
      const key = `${type}:${target}`;
      const existing = integrations.get(key);
      integrations.set(key, {
        type,
        target,
        usedBy: existing?.usedBy
          ? `${existing.usedBy}, ${usedBy}`
          : usedBy,
      });
    };

    for (const item of flow.manifest?.dataAction ?? []) {
      add(
        "Data Action",
        item.name ?? "Unnamed Data Action",
        (item.context ?? [])
          .map((c: AnyObj) => c.name ?? c.actionName)
          .filter(Boolean)
          .join(", ") || "Not specified",
      );
    }

    for (const container of flow.flowSequenceItemList ?? []) {
      const topLevelActions = [
        ...(container.actionList ?? []),
        ...(container.menuChoiceList ?? []).map((choice: AnyObj) => choice.action),
      ];
      for (const action of this.actionsDeep(topLevelActions)) {
        const usedBy = `${container.name ?? "Flow"}: ${action?.name ?? action?.__type ?? "Action"}`;
        switch (action?.__type) {
          case "DataAction":
            add(
              action.category?.name ?? "Data Action",
              action.actionName ?? "Unnamed Data Action",
              usedBy,
            );
            break;
          case "CallBotFlowAction":
            add(
              "Bot Flow",
              `${action.flowName ?? "Unnamed Bot Flow"} (${action.flowId ?? "ID not supplied"})`,
              usedBy,
            );
            break;
          case "TransferPureMatchAction": {
            const queues = (action.queues ?? [])
              .map((queue: AnyObj) => queue.text ?? queue.name)
              .filter(Boolean);
            if (queues.length) add("ACD Queue", queues.join(", "), usedBy);
            break;
          }
        }
      }
    }
    return [...integrations.values()];
  }

  // ---------------------------------------------------------------
  // Recursively pulls every ToAudioTTS("...") string out of a node
  // ---------------------------------------------------------------
  private extractTts(node: AnyObj): string[] {
    const found: string[] = [];
    const re = /ToAudioTTS\("((?:[^"\\]|\\.)*)"\)/g;

    const walk = (o: any) => {
      if (o && typeof o === "object") {
        if (!Array.isArray(o)) {
          const t = o.text;
          if (typeof t === "string" && t.includes("ToAudioTTS(")) {
            let m: RegExpExecArray | null;
            re.lastIndex = 0;
            while ((m = re.exec(t)) !== null) {
              const txt = m[1].replace(/\\"/g, '"');
              if (!found.includes(txt)) found.push(txt);
            }
          }
          for (const v of Object.values(o)) walk(v);
        } else {
          for (const v of o) walk(v);
        }
      }
    };
    walk(node);
    return found;
  }

  private decisionExpr(node: AnyObj): string {
    return node.expression?.text ?? "";
  }

  /** Returns [type, name, detailLines[]] for a single action node. */
  private describeAction(
    a: AnyObj,
    menus: AnyObj[],
  ): [string, string, string[]] {
    const t = a.__type ?? "?";
    const name = a.name ?? "(no name)";
    const details: string[] = [];

    for (const txt of this.extractTts(a)) {
      details.push(`TTS: "${txt}"`);
    }

    switch (t) {
      case "DecisionAction":
        details.push(`Condition: \`${this.decisionExpr(a)}\``);
        break;
      case "DataAction":
        details.push(`Data Action called: ${a.actionName}`);
        break;
      case "CallBotFlowAction":
        details.push(
          `Calls Bot Flow: ${a.flowName ?? "Unnamed Bot Flow"} (${a.flowId ?? "ID not supplied"})`,
        );
        break;
      case "TransferTaskAction":
        details.push(`Transfers execution to Task: ${a.taskName}`);
        break;
      case "TransferMenuAction":
        details.push(`Transfers execution to Menu: ${a.menuName}`);
        break;
      case "MenuAction": {
        const mid = a.menuReference;
        const mname = menus.find((m) => m.id === mid)?.name ?? mid;
        details.push(`Jumps into Menu: ${mname}`);
        break;
      }
      case "TransferPureMatchAction": {
        const queues = (a.queues ?? []).map((q: AnyObj) => q.text);
        const skills = (a.skills ?? []).map((s: AnyObj) => s.text);
        if (queues.length)
          details.push(`Transfers to Queue(s): ${queues.join(", ")}`);
        if (skills.length) details.push(`Skills: ${skills.join(", ")}`);
        break;
      }
      case "DisconnectAction":
        details.push("Ends the call.");
        break;
      default:
        break;
    }

    return [t, name, details];
  }

  /** Walks a Task's actionList as a graph, starting at startAction. */
  private walkTask(t: AnyObj, menus: AnyObj[]): string[] {
    const actions = new Map<string, AnyObj>(
      (t.actionList ?? []).map((a: AnyObj) => [a.id, a]),
    );
    const start: string | undefined = t.startAction;

    type StackItem = { id: string | undefined; depth: number; label: string };
    const stack: StackItem[] = [{ id: start, depth: 0, label: "Start" }];
    const order: {
      depth: number;
      label: string;
      a: AnyObj | null;
      id: string | undefined;
    }[] = [];
    const visited = new Set<string>();

    while (stack.length) {
      const { id, depth, label } = stack.shift()!;
      if (!id) continue;

      const a = actions.get(id) ?? null;
      order.push({ depth, label, a, id });

      if (!a) continue;
      if (visited.has(id)) continue;
      visited.add(id);

      let nexts: [string, string][] = [];
      const pathNexts: [string, string][] = (a.paths ?? [])
        .filter((p: AnyObj) => p.nextActionId)
        .map((p: AnyObj) => [p.nextActionId, p.label ?? ""]);

      if (pathNexts.length) {
        nexts = pathNexts;
      } else if (a.nextAction) {
        nexts = [[a.nextAction, ""]];
      }

      // insert children right after current position (depth-first)
      let insertAt = 0;
      const children = nexts.map(([nid, lab]) => ({
        id: nid,
        depth: depth + 1,
        label: lab,
      }));
      stack.splice(insertAt, 0, ...children);
    }

    const lines: string[] = [];
    const printedIds = new Set<string>();
    for (const { depth, label, a, id } of order) {
      const indent = "  ".repeat(depth);
      if (!a) {
        lines.push(
          `${indent}- **[${label}]** -> (external/unresolved target: \`${id}\`)`,
        );
        continue;
      }
      const [atype, name, details] = this.describeAction(a, menus);
      const alreadyShown = id !== undefined && printedIds.has(id);
      lines.push(
        `${indent}- **[${label}] ${name}** (${atype})${
          alreadyShown ? " *(already shown above — loop/merge point)*" : ""
        }`,
      );
      if (id) printedIds.add(id);
      for (const d of details) lines.push(`${indent}  - ${d}`);
    }
    lines.push("");
    return lines;
  }

  /** Renders a Menu's greeting TTS + digit choice table. */
  private describeMenu(m: AnyObj, menus: AnyObj[]): string[] {
    const lines: string[] = [];
    for (const txt of this.extractTts(m.prompts ?? {})) {
      lines.push(`**Greeting TTS:** "${txt}"\n`);
    }
    lines.push("| Digit | Choice Name | Action Type | Detail |");
    lines.push("|---|---|---|---|");
    for (const c of m.menuChoiceList ?? []) {
      const [atype, aname, details] = this.describeAction(
        c.action ?? {},
        menus,
      );
      const detailStr = details.join("<br>");
      lines.push(
        `| ${c.digit ?? "-"} | ${c.name ?? aname} | ${atype} | ${detailStr} |`,
      );
    }
    lines.push("");
    return lines;
  }
}
