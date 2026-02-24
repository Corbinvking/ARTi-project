import logging as log 

logger = log.getLogger(__name__)
logger.setLevel(log.INFO)
console_handler = log.StreamHandler()
file_handler = log.FileHandler("logs.log")

formatter = log.Formatter("%(asctime)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

logger.addHandler(console_handler)
logger.addHandler(file_handler)