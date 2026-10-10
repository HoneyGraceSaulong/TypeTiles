import { Link } from "react-router-dom";
import { STENO_EXERCISES } from "../data/stenoExercises";

export default function WordBank() {
  return (
    <section className="h-full overflow-y-auto pb-6" aria-labelledby="word-bank-heading">
      <div className="rounded-[8px] bg-[linear-gradient(197deg,#08122e_17%,rgba(43,51,89,.9)_46%,#13173b_81%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[998px]">
          <Link to="/app/customize" className="inline-flex rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 px-4 py-2 text-sm font-medium text-white transition hover:bg-[#233f9d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6a9eff]">
            Back to Profile
          </Link>
          <h1 id="word-bank-heading" className="mt-6 text-2xl font-semibold text-white sm:text-3xl">Gregg Stenography Word Bank</h1>
          <p className="mt-3 leading-7 text-slate-300">Review shorthand strokes and their corresponding English sentences to learn and practice Gregg stenography.</p>
          <div className="mt-6 space-y-6">
            {STENO_EXERCISES.map((exercise, index) => (
              <article key={exercise.id} aria-labelledby={`${exercise.id}-heading`} className="rounded-[8px] border border-[#2967a1] bg-[#0a1325]/70 p-4 sm:p-6">
                <h2 id={`${exercise.id}-heading`} className="text-lg font-semibold text-white">Exercise {exercise.exerciseNumber}</h2>
                <figure className="mt-4">
                  <img
                    src={exercise.imagePath}
                    alt={`Gregg shorthand strokes for exercise ${exercise.exerciseNumber}; English reference sentence follows below.`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="block h-auto w-full rounded-[8px] object-contain"
                  />
                  <figcaption className="mt-4 text-base leading-7 text-slate-100 sm:text-lg">{exercise.sentence}</figcaption>
                </figure>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
