import os
from datetime import datetime

from arelle import ModelManager, FileSource, Cntlr, ModelXbrl, ViewFileFactList

debug = 1


def process_file(filename: str):
    if debug > 0: start_time = datetime.now()
    model_manager = ModelManager.initialize(
        Cntlr.Cntlr(logFileName='C:\\Users\\bme\\projects\\xbrl-python\\logs.log'))
    if debug > 1: print('init model:', datetime.now() - start_time)
    filesource = FileSource.FileSource(filename)
    if debug > 1: print('define filesource:', datetime.now() - start_time)
    xbrl = ModelXbrl.load(model_manager, filesource)
    if debug > 1: print('loaded model:', datetime.now() - start_time)
    name_parts = filename.split('_')
    date_folder = os.path.split(os.path.split(filename)[0])[1]
    output_name = "{0}_{1}-{2}-{3}.csv".format(name_parts[2], name_parts[3][0:4],
                                               name_parts[3][4:6], name_parts[3][6:8])
    output_path = os.path.normpath(filename + '/../../../facts/' + date_folder + '/' + output_name)
    if debug > 1: print('output to', output_path)
    ViewFileFactList.viewFacts(xbrl, output_path,
                               cols='Label,Name,contextRef,Value,EntityIdentifier,Period,unitRef,Dec')
    if debug > 0: print(f'output {output_name}:', datetime.now() - start_time)
    if os.path.exists(output_path):
        os.remove(filename)  # if the output file exists, remove the input file to prevent duplicate


if __name__ == '__main__':
    # todo: add multiprocessing
    dir_name = 'C:\\Users\\bme\\projects\\companies-house-database' \
               '-manager\\samples\\financials\\unzipped\\2020-12-31'
    files = os.scandir(dir_name)
    for file in files.__iter__():
        if file.is_file():
            if debug > 1: print('processing', file.path)
            process_file(file.path)
