import { UserProfile } from './auth-context';

export interface Icebreaker {
  id: string;
  text: string;
  type: 'funny' | 'deep' | 'casual';
}

/**
 * Genera rompehielos basados en intereses comunes y perfiles.
 * En una app real, esto llamaría a una Cloud Function con OpenAI/Gemini.
 * Aquí implementamos una lógica avanzada de plantillas dinámicas.
 */
export async function generateIcebreakers(me: UserProfile, target: UserProfile | any, isDouble: boolean = false, lang: string = 'en'): Promise<Icebreaker[]> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, 1500));

  const myInterests = me.interests || [];
  const targetInterests = target.interests || [];
  const commonInterests = myInterests.filter(i => targetInterests.includes(i));

  const templates: Icebreaker[] = [];

  if (lang === 'es') {
    if (isDouble) {
      templates.push({
        id: 'd1',
        text: `¡Hola! Veo que a todos nos gusta el ${commonInterests[0] || 'salir'}. ¿Qué tal un plan grupal pronto?`,
        type: 'casual'
      });
      templates.push({
        id: 'd2',
        text: `¡Duelo de parejas! ¿Quién creen que ganaría en una competencia de ${commonInterests[0] || 'anecdotas'}?`,
        type: 'funny'
      });
    } else {
      if (commonInterests.length > 0) {
        const interest = commonInterests[0];
        templates.push({
          id: '1',
          text: `¡Hola ${target.name}! Veo que ambos somos fans de ${interest}. ¿Cuál es tu lugar favorito para eso?`,
          type: 'casual'
        });
        templates.push({
          id: '2',
          text: `Si tuviéramos que elegir el mejor plan de ${interest}, ¿cuál sería el tuyo?`,
          type: 'deep'
        });
      } else {
        templates.push({
          id: '3',
          text: `¡Hola ${target.name}! Tu perfil me pareció súper interesante. ¿Cuál es la historia detrás de tu primera foto?`,
          type: 'casual'
        });
        templates.push({
          id: '4',
          text: `Pregunta rápida: ¿Team café ☕ o Team mate/té 🍵 para una primera cita?`,
          type: 'funny'
        });
      }
    }
  } else {
    // English (Default)
    if (isDouble) {
      templates.push({
        id: 'd1',
        text: `Hey! I see we all like ${commonInterests[0] || 'hanging out'}. How about a group plan soon?`,
        type: 'casual'
      });
      templates.push({
        id: 'd2',
        text: `Double trouble! Who do you think would win in a ${commonInterests[0] || 'storytelling'} contest?`,
        type: 'funny'
      });
    } else {
      if (commonInterests.length > 0) {
        const interest = commonInterests[0];
        templates.push({
          id: '1',
          text: `Hi ${target.name}! I see we're both fans of ${interest}. What's your favorite spot for that?`,
          type: 'casual'
        });
        templates.push({
          id: '2',
          text: `If we had to pick the ultimate ${interest} experience, what would yours be?`,
          type: 'deep'
        });
      } else {
        templates.push({
          id: '3',
          text: `Hi ${target.name}! Your profile caught my eye. What's the story behind your first photo?`,
          type: 'casual'
        });
        templates.push({
          id: '4',
          text: `Quick question: Team Coffee ☕ or Team Tea/Smoothie 🍵 for a first date?`,
          type: 'funny'
        });
      }
    }
  }

  // Mezclar y devolver 3
  return templates.sort(() => Math.random() - 0.5).slice(0, 3);
}
