import { db } from "@/db";
import { quizes, questions as dbQuestions, questionAnswers } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";
import { isContext } from "vm";

type Quiz = InferInsertModel<typeof quizes>;
type Question = InferInsertModel<typeof dbQuestions>;
type Answer = InferInsertModel<typeof questionAnswers>;

interface SaveQuizData extends Quiz {
    questions: Array<Question & {answers ?: Answer[]}>;
}

export default async function saveQuiz(quizData: SaveQuizData) {
    const {name,description,questions} = quizData;
    const newQuiz = await db
    .insert(quizes)
    .values({
        name,
        description
    })
    .returning({ insertedId: quizes.id});
    const quizId = newQuiz[0].insertedId;

    await db.transaction(async(tx) =>{
        for (const question of questions){
            const [{questionId}] = await tx
            .insert(dbQuestions)
            .values({
                questionText: question.questionText,
                quizId
            })
            .returning({questionId:dbQuestions.id});

            if(question.answers && question.answers.length > 0){
                await tx.insert(questionAnswers).values(
                    question.answers.map((answer) =>({
                        answerText: answer.answerText,
                        isCorrect: answer.isCorrect,
                        questionId
                    }))
                    
                )
            }
        }
    })

    return {quizId};
}