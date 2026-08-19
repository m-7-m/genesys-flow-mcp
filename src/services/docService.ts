// docService.ts
// Converts a Genesys Cloud Architect flow export (JSON) into a readable
// Markdown documentation (elements + TTS for the whole call flow).

type AnyObj = Record<string, any>;

export class DocService {
  /**
   * Entry point — pass the parsed flow JSON (the file you get from
   * /flows/{flowId}/latestconfiguration) and get back a Markdown string.
   */
  public generateReadme(flow: AnyObj, route?: AnyObj): string {
    const seq: AnyObj[] = flow.flowSequenceItemList ?? [];
    const tasks = seq.filter((x) => x.__type === "Task");
    const menus = seq.filter((x) => x.__type === "Menu");

    const lines: string[] = [];

    lines.push(`# ${route?.name ?? flow.name ?? "Untitled Flow"}\n`);

    // ---------- Route ----------
    lines.push("## Route\n");
    lines.push(`**IVR Name:** ${route?.name ?? "Not supplied"}  `);
    lines.push(`**IVR ID:** \`${route?.id ?? "Not supplied"}\`  `);
    if (route?.dnis?.length) lines.push(`**DNIS:** ${route.dnis.join(", ")}  `);
    if (route?.state) lines.push(`**State:** ${route.state}  `);
    lines.push("\n### Configured Flow\n");
    lines.push(`**Name:** ${flow.name ?? "Untitled Flow"}  `);
    lines.push(`**ID:** \`${route?.openHoursFlow?.id ?? flow.id ?? "Not supplied"}\`  `);
    lines.push("**Assignment:** Open-hours flow\n");
    lines.push("---\n");

    // ---------- Business focus ----------
    lines.push("## Business Focus\n");
    lines.push("### Purpose\n");
    lines.push(`${flow.description ?? "No flow description is configured."}\n`);
    lines.push("### Customer Routing\n");
    lines.push("| Menu | Option | Customer choice | Destination |");
    lines.push("|---|---|---|---|");
    for (const m of menus) {
      for (const c of m.menuChoiceList ?? []) {
        lines.push(
          `| ${m.name ?? "Unnamed menu"} | ${c.digit ?? "-"} | ${c.name ?? "Unnamed choice"} | ${this.businessDestination(c.action ?? {}, menus)} |`,
        );
      }
    }
    lines.push("\n---\n");

    // ---------- Technical focus ----------
    lines.push("## Technical Focus\n");
    lines.push("### Flow Configuration\n");
    lines.push(`**Default language:** ${flow.defaultLanguage ?? ""}  `);
    const ttsVoice =
      flow.supportedLanguageOptions?.[0]?.textToSpeech?.voice?.name ?? "";
    lines.push(`**TTS Voice:** ${ttsVoice}\n`);

    // ---------- Variables ----------
    lines.push("## Flow-scoped Variables\n");
    lines.push("| Variable | Type | Default | Description |");
    lines.push("|---|---|---|---|");
    for (const v of flow.variables ?? []) {
      const vtype = (v.__type ?? "").replace("Variable", "");
      const def = v.initialValue?.text ?? "";
      lines.push(
        `| \`${v.name}\` | ${vtype} | \`${def}\` | ${v.description ?? ""} |`,
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
      const actions = [
        ...(container.actionList ?? []),
        ...(container.menuChoiceList ?? []).map((choice: AnyObj) => choice.action),
      ];
      for (const action of actions) {
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
