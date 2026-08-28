import asyncio
import logging
from typing import Optional
import backend.db as db
from backend.logger import app_logger

logger = logging.getLogger(__name__)

class BatchWorker:
    def __init__(self, concurrency: int = 2, poll_interval: float = 2.0):
        self.concurrency = concurrency
        self.poll_interval = poll_interval
        self.semaphore = asyncio.Semaphore(concurrency)
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        app_logger.info(f"BatchWorker started with concurrency={self.concurrency}.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        app_logger.info("BatchWorker stopped.")

    async def _run_loop(self):
        while self.is_running:
            try:
                pending_jobs = await asyncio.to_thread(db.get_pending_jobs, limit=self.concurrency)
                if pending_jobs:
                    tasks = [self._process_single_job(job) for job in pending_jobs]
                    await asyncio.gather(*tasks, return_exceptions=True)
                else:
                    await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                app_logger.error(f"BatchWorker loop error: {e}", exc_info=True)
                await asyncio.sleep(self.poll_interval)

    async def _process_single_job(self, job: dict):
        async with self.semaphore:
            job_id = job["id"]
            user_email = job.get("user_email", "default")
            filename = job.get("filename", "batch_file.txt")

            try:
                # 1. Mark as processing
                await asyncio.to_thread(
                    db.update_job_status,
                    job_id=job_id,
                    status="processing",
                    progress=25,
                    user_email=user_email,
                )

                # Simulated processing delay for queue
                await asyncio.sleep(1.0)

                # 2. Complete Job
                await asyncio.to_thread(
                    db.update_job_status,
                    job_id=job_id,
                    status="completed",
                    progress=100,
                    user_email=user_email,
                )
                app_logger.info(f"[BatchWorker] Successfully processed job {job_id} ({filename})")
            except Exception as e:
                app_logger.error(f"[BatchWorker] Job {job_id} failed: {e}")
                await asyncio.to_thread(
                    db.update_job_status,
                    job_id=job_id,
                    status="failed",
                    progress=0,
                    error_message=str(e),
                    user_email=user_email,
                )

# Global worker instance
batch_worker = BatchWorker(concurrency=2, poll_interval=2.0)
