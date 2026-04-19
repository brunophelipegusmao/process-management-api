import type { EmailEntity } from './email.repository';

export type EmailTemplateVariables = Record<
  string,
  string | number | undefined
>;

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type EmailTemplateRenderer = (
  variables: EmailTemplateVariables,
) => RenderedEmailTemplate;

function valueOf(
  variables: EmailTemplateVariables,
  key: string,
  fallback: string,
) {
  const value = variables[key];

  if (value === undefined || value === null || `${value}`.trim().length === 0) {
    return fallback;
  }

  return `${value}`;
}

const emailTemplateRenderers: Record<
  EmailEntity['template'],
  EmailTemplateRenderer
> = {
  E1: (variables) => {
    const witnessName = valueOf(variables, 'witnessName', 'testemunha');
    const processCode = valueOf(variables, 'processCode', 'processo');
    const dueDate = valueOf(variables, 'dueDate', 'data nao informada');

    return {
      subject: `Dados pendentes da testemunha ${witnessName}`,
      html: `<p>O processo ${processCode} ainda depende dos dados da testemunha <strong>${witnessName}</strong>.</p><p>Prazo atual: <strong>${dueDate}</strong>.</p>`,
      text: `O processo ${processCode} ainda depende dos dados da testemunha ${witnessName}. Prazo atual: ${dueDate}.`,
    };
  },
  E2: (variables) => {
    const processCode = valueOf(variables, 'processCode', 'processo');

    return {
      subject: `Atualizacao registrada no ${processCode}`,
      html: `<p>Uma nova atualizacao operacional foi registrada no processo <strong>${processCode}</strong>.</p>`,
      text: `Uma nova atualizacao operacional foi registrada no processo ${processCode}.`,
    };
  },
  E3: (variables) => {
    const processCode = valueOf(variables, 'processCode', 'processo');
    const nextAction = valueOf(variables, 'nextAction', 'nova providencia');

    return {
      subject: `Providencia necessaria no ${processCode}`,
      html: `<p>O processo <strong>${processCode}</strong> exige a seguinte providencia: <strong>${nextAction}</strong>.</p>`,
      text: `O processo ${processCode} exige a seguinte providencia: ${nextAction}.`,
    };
  },
  E4: (variables) => {
    const processCode = valueOf(variables, 'processCode', 'processo');
    const hearingDate = valueOf(variables, 'hearingDate', 'data nao informada');

    return {
      subject: `Audiencia cancelada no ${processCode}`,
      html: `<p>A audiencia prevista para <strong>${hearingDate}</strong> no processo <strong>${processCode}</strong> foi cancelada.</p>`,
      text: `A audiencia prevista para ${hearingDate} no processo ${processCode} foi cancelada.`,
    };
  },
  E5: (variables) => {
    const processCode = valueOf(variables, 'processCode', 'processo');
    const previousDate = valueOf(
      variables,
      'previousDate',
      'data anterior nao informada',
    );
    const newDate = valueOf(variables, 'newDate', 'nova data nao informada');

    return {
      subject: `Audiencia redesignada no ${processCode}`,
      html: `<p>A audiencia do processo <strong>${processCode}</strong> foi redesignada de <strong>${previousDate}</strong> para <strong>${newDate}</strong>.</p>`,
      text: `A audiencia do processo ${processCode} foi redesignada de ${previousDate} para ${newDate}.`,
    };
  },
  E6: (variables) => {
    const processCode = valueOf(variables, 'processCode', 'processo');
    const message = valueOf(
      variables,
      'message',
      'ha uma nova atualizacao operacional',
    );

    return {
      subject: `Comunicado operacional do ${processCode}`,
      html: `<p>${message} no processo <strong>${processCode}</strong>.</p>`,
      text: `${message} no processo ${processCode}.`,
    };
  },
};

export function renderEmailTemplate(
  template: EmailEntity['template'],
  variables: EmailTemplateVariables,
) {
  return emailTemplateRenderers[template](variables);
}
