from transformers import pipeline
import os
import sys
import polars as pl

sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment",
    tokenizer="cardiffnlp/twitter-roberta-base-sentiment"
)
mapping = {
    "LABEL_0": -1,
    "LABEL_1": 0,
    "LABEL_2": 1,
}
input_filepath = os.path.join(os.path.dirname(__file__) + '/../../static/data/gnews/parsed', 'consolidated_gnews.parquet')
indiv_filepath = os.path.join(os.path.dirname(__file__) + '/../../static/data/gnews/parsed', 'scored_consolidated_gnews.parquet')
aggregate_filepath = os.path.join(os.path.dirname(__file__) + '/../../static/data/gnews/parsed', 'aggregated_gnews_scores.parquet')
indiv_output = []
agg_output = {}

def analyseIndiv():
    
    try:
        df = pl.scan_parquet(input_filepath).collect()
        for row in df.iter_rows(named=True):
            title = row['title']
            res = sentiment_pipeline(title)
            label, score = res[0]['label'], res[0]['score']
            row['label'] = mapping[label]
            row['score'] = score
            indiv_output.append(row)
        indiv = pl.DataFrame(indiv_output)
        indiv.write_parquet(indiv_filepath)     
        print(f"Analysed and saved individual sentiment analysis, output file: {indiv_filepath}")
        
    except Exception as e:
        print(f"failed to analyse individual news, error: {e}")


        
def consolidateScores():
    try:
        df = pl.scan_parquet(indiv_filepath).collect()
        agg_df = df.drop("title").group_by("month", "town").agg((pl.col("score") * pl.col("label")).sum().alias("aggregated_score"), (pl.col("score") * pl.col("label")).mean().alias("mean_score")).sort(["town", "month"], descending=True)
        agg_df.write_parquet(aggregate_filepath)
        print(f"Consolidated and saved aggregated sentiment analysis, output file: {indiv_filepath}")
        
    except Exception as e:
        print(f"failed to consolidate gnews sentiment analysis scores, error: {e}")

    
# Using the special variable 
# __name__
if __name__=="__main__":
    consolidateScores()