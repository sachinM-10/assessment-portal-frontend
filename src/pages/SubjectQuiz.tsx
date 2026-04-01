import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface Question {
  _id: string;
  subject: string;
  question: string;
  options: string[];
}

export default function SubjectQuiz() {
  const { subject } = useParams<{ subject: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Prevent closing window during quiz
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (questions.length > 0 && !results) {
        e.preventDefault();
        e.returnValue = "Are you sure? Your attempt has already been registered and leaving will forfeit it.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [questions, results]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchQuestions();
  }, [subject]);

  useEffect(() => {
    if (!loading && !results && questions.length > 0) {
      setTimeLeft(10 * 60); // 10 minutes
    }
  }, [loading, results, questions]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || results) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, results]);

  const fetchQuestions = async () => {
    try {
      const data = await apiFetch(`/student/quizzes/${subject}`);
      if (Array.isArray(data)) {
        setQuestions(data);
      } else {
        setQuestions(data.questions);
        setAttemptId(data.attemptId);
      }
    } catch (error: any) {
      try {
        const parsed = JSON.parse(error.message);
        setErrorInfo(parsed.error || error.message);
      } catch {
        setErrorInfo(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && Object.keys(answers).length < questions.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch('/student/submit', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          answers,
          attemptId
        })
      });
      setResults(result);
      toast({
        title: "Quiz Completed!",
        description: `You scored ${result.score} out of ${result.total}`,
      });
    } catch (error: any) {
      toast({
        title: "Error submitting quiz",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (errorInfo) {
    const isLimit = errorInfo.toLowerCase().includes("maximum") || errorInfo.toLowerCase().includes("limit");
    return (
      <Layout>
        <div className="text-center py-12 max-w-lg mx-auto">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl text-destructive font-bold font-heading">
                {isLimit ? "Attempt Limit Reached" : "Quiz Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">{errorInfo}</p>
              <Button onClick={() => navigate('/subjects')}>Back to Subjects</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No questions available for {subject} yet.</h2>
          <Button onClick={() => navigate('/subjects')}>Back to Subjects</Button>
        </div>
      </Layout>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{subject} Quiz</h1>
          {!results && timeLeft !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-warning" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {results ? (
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center">
                <h2 className="text-3xl font-bold mb-2">Final Score</h2>
                <div className="text-5xl font-black text-primary mb-4">
                  {results.score} / {results.total}
                </div>
                <p className="text-muted-foreground">
                  Percentage: {Math.round((results.score / results.total) * 100)}%
                </p>
                <div className="flex gap-4 justify-center mt-4 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> {results.results.filter((r: any) => r.isCorrect).length} Correct</span>
                  <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /> {results.results.filter((r: any) => !r.isCorrect).length} Wrong / Unanswered</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Review Answers</h3>
              {results.results.map((res: any, index: number) => (
                <Card key={res.questionId} className={res.isCorrect ? "border-green-500/50" : "border-red-500/50"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>{index + 1}. {res.question}</span>
                      {res.isCorrect ? (
                        <CheckCircle2 className="text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="text-red-500 shrink-0" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mt-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold w-24">Your Answer:</span>
                        <span className={res.isCorrect ? "text-green-600" : "text-red-600 font-medium"}>
                          {res.userAnswer}
                        </span>
                      </div>
                      {!res.isCorrect && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold w-24">Correct:</span>
                          <span className="text-green-600 font-medium">
                            {res.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/subjects')}>
                Return to Subjects
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, index) => (
              <Card key={q._id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {index + 1}. {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    onValueChange={(val) => handleAnswer(q._id, val)} 
                    value={answers[q._id]}
                    className="space-y-3"
                  >
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                        <RadioGroupItem value={opt} id={`${q._id}-${i}`} />
                        <Label htmlFor={`${q._id}-${i}`} className="flex-grow cursor-pointer font-normal text-base">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
