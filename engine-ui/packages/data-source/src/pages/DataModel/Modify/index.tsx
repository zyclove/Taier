/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useEffect, useRef } from 'react';
import Container from 'pages/DataModel/components/Container';
import { Steps, Button, Form, Modal } from 'antd';
import './style';
import { API } from '@/services';
import Message from 'pages/DataModel/components/Message';
import _ from 'lodash';
import { IModelDetail, EnumModelStatus } from 'pages/DataModel/types';
import { EnumModifyStep, EnumModifyMode } from './types';
import BreadCrumbRender from './BreadCrumbRender';
import CodeBlock from 'pages/DataModel/components/CodeBlock';
import stepIconRender from '@/utils/stepIconRender';
const idGenerator = () => {
  let _id = 0;
  return () => ++_id + '';
};

const identifyColumns = idGenerator();
const identifyJoinList = idGenerator();
interface IPropsModify {
  form: any;
  router?: any;
  params: any;
}

const { Step } = Steps;
import BasicInfo from './BasicInfo';
import RelationTableSelect from './RelationTableSelect';
import PartitionField from './PartitionField';
import FieldSelect from './FieldsSelect';
import historyPsuhWithQuery from '@/utils/historyPushWithQuery';

const stepRender = (current: EnumModifyStep, params: any) => {
  const {
    childRef,
    modelDetail,
    globalStep,
    mode,
    setModelDetail,
    setDisabled,
  } = params;
  switch (current) {
    case EnumModifyStep.BASIC_STEP:
      return (
        <BasicInfo
          mode={mode}
          globalStep={globalStep}
          cref={childRef}
          modelDetail={modelDetail}
          updateModelDetail={setModelDetail}
        />
      );
    case EnumModifyStep.RELATION_TABLE_STEP:
      return (
        <RelationTableSelect
          mode={mode}
          globalStep={globalStep}
          cref={childRef}
          modelDetail={modelDetail}
          updateModelDetail={setModelDetail}
          setDisabled={setDisabled}
        />
      );
    case EnumModifyStep.DIMENSION_STEP:
      return (
        <FieldSelect cref={childRef} step={current} modelDetail={modelDetail} />
      );
    case EnumModifyStep.METRIC_STEP:
      return (
        <FieldSelect cref={childRef} step={current} modelDetail={modelDetail} />
      );
    case EnumModifyStep.SETTING_STEP:
      return (
        <PartitionField cref={childRef} modelDetail={modelDetail} mode={mode} />
      );
  }
};

const Modify = (props: IPropsModify) => {
  const { form, router, params } = props;
  const _id = params.id;
  const modelId: number = _id ? parseInt(_id) : _id;
  const mode = modelId === undefined ? EnumModifyMode.ADD : EnumModifyMode.EDIT;
  const breadcrumTitle = mode === EnumModifyMode.ADD ? '新建模型' : '编辑模型';
  const [current, setCurrent] = useState<EnumModifyStep>(
    EnumModifyStep.BASIC_STEP
  );
  // 按钮点击状态
  const [disabled, setDisabled] = useState(false);

  const globalStep = useRef(-1);

  const [visibleSqlpreview, setVisibleSqlPreview] = useState({
    visible: false,
    sql: '',
  });

  const [modelDetail, setModelDetail] = useState<Partial<IModelDetail>>({});

  const getModelDetail = async (id: number) => {
    try {
      const { success, data, message } = await API.getModelDetail({
        id,
        version: '0',
      });
      if (success) {
        globalStep.current = data.step - 1;
        // 当前模型保存步数在第一步或者第二步，需要通过dsId,schema,tableName获取字段列表
        if (globalStep.current < EnumModifyStep.DIMENSION_STEP) {
          window.localStorage.setItem('refreshColumns', 'true');
        }
        const columns = data.columns.map((item) => ({
          ...item,
          id: identifyColumns(),
        }));
        const joinList = data.joinList.map((item) => ({
          ...item,
          id: identifyJoinList(),
        }));
        setModelDetail({
          ...data,
          columns,
          joinList,
          id: modelId,
        });
      } else {
        Message.error(message);
      }
    } catch (error) {
      Message.error(error.message);
    }
  };

  const saveDataModel = async (
    params?: Partial<IModelDetail>,
    callback?: Function
  ) => {
    try {
      const { success, message, data } = await API.saveDataModel(params);
      if (success) {
        Message.success('保存成功');
        if (typeof callback) {
          callback(data);
        }
      } else {
        Message.error(message);
      }
    } catch (error) {
      Message.error(error.message);
    }
  };

  const releaseModel = async (id: number, callback?: Function) => {
    try {
      const { success, message } = await API.releaseModel({ id });
      if (success) {
        if (typeof callback === 'function') {
          callback();
        }
      } else {
        Message.error(message);
      }
    } catch (error) {
      Message.error(error.message);
    }
  };

  const saveAndPublish = (params: Partial<IModelDetail>, callback) => {
    saveDataModel(params, (id) => {
      releaseModel(id, callback);
    });
  };

  const handlePrevStep = () => {
    const data = childRef.current.getValue();
    setModelDetail((prev) => ({
      ...prev,
      ...data,
    }));
    setCurrent((current) => current - 1);

    return;
  };

  const handleNextStep = () => {
    childRef.current.validate().then((data) => {
      setModelDetail((prev) => ({
        ...prev,
        ...data,
      }));
      setCurrent((current) => current + 1);
    });
    return;
  };

  const getSql = async (params: any) => {
    try {
      const { success, data, message } = await API.previewSql(params);
      if (success) {
        setVisibleSqlPreview({
          visible: true,
          sql: data.result,
        });
      } else {
        Message.error(message);
      }
    } catch (error) {
      Message.error(error.message);
    }
  };

  useEffect(() => {
    if (mode === EnumModifyMode.ADD) return;
    getModelDetail(modelId);
  }, [modelId]);

  const childRef = useRef(null);

  return (
    <Container>
      <div className="dm-model-modify">
        <div className="breadcrumb-area">
          <BreadCrumbRender
            links={[
              { label: '数据模型', href: '/data-model/list' },
              { label: breadcrumTitle },
            ]}
          />
        </div>
        <div className="content">
          <header className="step-header">
            <Steps className="dm-steps" current={current}>
              {['基础信息', '表关联', '选择维度', '选择度量', '设置'].map(
                (title, index) => (
                  <Step
                    key={index}
                    title={title}
                    icon={stepIconRender(index, current)}
                  />
                )
              )}
            </Steps>
          </header>
          <div className="step-content">
            <div className="inner-container overflow-auto">
              <div className="form-area">
                {stepRender(current, {
                  childRef,
                  modelDetail,
                  globalStep: globalStep.current,
                  mode: mode,
                  setModelDetail,
                  setDisabled,
                })}
              </div>
              <Modal
                title="预览SQL"
                visible={visibleSqlpreview.visible}
                onOk={() => {
                  setVisibleSqlPreview({
                    visible: false,
                    sql: '',
                  });
                }}
                onCancel={() => {
                  setVisibleSqlPreview({
                    visible: false,
                    sql: '',
                  });
                }}>
                <CodeBlock code={visibleSqlpreview.sql} />
              </Modal>
            </div>
          </div>
          <footer className="step-footer">
            <div className="button-area">
              {current === EnumModifyStep.BASIC_STEP ? (
                <Button
                  className="margin-right-8 width-80"
                  onClick={() =>
                    historyPsuhWithQuery(router, '/data-model/list')
                  }>
                  取消
                </Button>
              ) : null}
              {current > EnumModifyStep.BASIC_STEP ? (
                <Button
                  className="margin-right-8 width-80"
                  disabled={disabled}
                  onClick={handlePrevStep}>
                  上一步
                </Button>
              ) : null}
              {current < EnumModifyStep.SETTING_STEP ? (
                <Button
                  className="margin-right-8 width-80"
                  type="primary"
                  disabled={disabled}
                  onClick={handleNextStep}>
                  下一步
                </Button>
              ) : null}
              {current === EnumModifyStep.SETTING_STEP ? (
                <Button
                  className="margin-right-8 width-80"
                  type="primary"
                  onClick={() => {
                    form.validateFields((err, data) => {
                      if (err) return;
                      const params = {
                        ...modelDetail,
                        ...data,
                        step: current + 1,
                      };
                      params.columnList = params.columns;
                      delete params.columns;
                      getSql(params);
                    });
                  }}>
                  预览SQL
                </Button>
              ) : null}
              <Button
                className="margin-right-8 width-80"
                disabled={disabled}
                onClick={() => {
                  childRef.current.validate().then((data) => {
                    // 数据同步
                    setModelDetail({
                      ...modelDetail,
                      ...data,
                    });
                    const step = Math.max(globalStep.current + 1, current + 1);
                    const params = {
                      ...modelDetail,
                      ...data,
                      step,
                    };
                    params.columnList = params.columns?.map((item) => {
                      item.columnDesc = item.columnComment;
                      delete item.columnComment;
                      return { ...item };
                    });
                    delete params.columns;
                    saveDataModel(params, () => {
                      historyPsuhWithQuery(router, '/data-model/list');
                    });
                  });
                }}
                type="primary">
                保存
              </Button>
              {current === EnumModifyStep.SETTING_STEP &&
              modelDetail.modelStatus !== EnumModelStatus.RELEASE ? (
                <Button
                  onClick={() => {
                    childRef.current.validate().then((data) => {
                      // 数据同步
                      setModelDetail({
                        ...modelDetail,
                        ...data,
                      });
                      const step = Math.max(
                        globalStep.current + 1,
                        current + 1
                      );
                      const params = {
                        ...modelDetail,
                        ...data,
                        step,
                      };
                      params.columnList = params.columns?.map((item) => {
                        item.columnDesc = item.columnComment;
                        delete item.columnComment;
                        return { ...item };
                      });
                      delete params.columns;
                      saveAndPublish(params, () => {
                        historyPsuhWithQuery(router, '/data-model/list');
                      });
                    });
                  }}
                  disabled={disabled}
                  type="primary">
                  保存并发布
                </Button>
              ) : null}
            </div>
          </footer>
        </div>
      </div>
    </Container>
  );
};

export default Form.create()(Modify);